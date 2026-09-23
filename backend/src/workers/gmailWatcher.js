import cron from 'node-cron';
import mongoose from 'mongoose';
import { google } from 'googleapis';
import { getGmailClient } from '../config/googleAuth.js';
import { cleanupLegacyIndexes } from '../config/db.js';
import Invoice from '../models/Invoice.js';
import Item from '../models/Item.js';
import ProcessedMail from '../models/ProcessedMail.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import StagedInvoice from '../models/StagedInvoice.js';
import { parseInvoicePDF } from '../services/invoiceParser.js';
import { processRestock } from '../services/inventoryService.js';

let cronTask = null;
let isSyncInProgress = false;
let syncStartTime = null;

/**
 * Real-time sync progress state for UI polling
 */
export let syncProgress = {
  inProgress: false,
  forceRescan: false,
  startedAt: null,
  totalFound: 0,
  currentIndex: 0,
  currentFilename: null,
  statusMessage: 'Ready to sync',
  processed: 0,
  skipped: 0,
  errors: 0,
  itemsImported: 0,
  invoices: [],
  logs: [],
  lastResult: null,
};

export const getSyncProgress = () => {
  return {
    ...syncProgress,
    elapsedSeconds: syncProgress.startedAt && syncProgress.inProgress
      ? Math.floor((Date.now() - syncProgress.startedAt) / 1000)
      : 0,
  };
};

/**
 * Safely upsert a record into ProcessedMail without failing on legacy index errors
 */
const safeRecordProcessedMail = async (filter, updateDoc) => {
  try {
    await ProcessedMail.updateOne(filter, updateDoc, { upsert: true });
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('E11000')) {
      try {
        await mongoose.connection.collection('processedmails').dropIndex('messageId_1').catch(() => {});
        await ProcessedMail.updateOne(filter, updateDoc, { upsert: true }).catch(() => {});
      } catch {
        // Non-fatal cache write failure
      }
    } else {
      console.warn('[GmailWatcher] ProcessedMail record warning:', err.message);
    }
  }
};

/**
 * Recursively find all PDF attachment parts in a Gmail message payload
 */
const findPdfParts = (payload) => {
  const pdfParts = [];

  const traverse = (part) => {
    if (!part) return;

    const filename = (part.filename || '').toLowerCase();
    const mime = (part.mimeType || '').toLowerCase();

    const isPdf =
      filename.endsWith('.pdf') ||
      mime === 'application/pdf' ||
      mime === 'application/x-pdf' ||
      mime === 'application/acrobat' ||
      mime === 'applications/vnd.pdf' ||
      mime.includes('pdf') ||
      ((mime === 'application/octet-stream' || mime === 'binary/octet-stream') && filename.endsWith('.pdf')) ||
      (filename && (filename.includes('invoice') || filename.includes('bill') || filename.includes('tax') || filename.includes('receipt')) && (filename.endsWith('.pdf') || mime.includes('pdf') || !filename.includes('.')));

    const hasContent = part.body && (part.body.attachmentId || part.body.data);

    if (isPdf && hasContent) {
      pdfParts.push(part);
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  };

  traverse(payload);
  return pdfParts;
};

/**
 * Resolve target organization ID for Gmail sync
 */
const resolveOrganizationId = async (providedOrgId) => {
  if (providedOrgId) return String(providedOrgId);

  try {
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_ALERT_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length > 0) {
      const adminUser = await User.findOne({ email: { $in: adminEmails }, organizationId: { $ne: null } }).lean();
      if (adminUser?.organizationId) {
        return adminUser.organizationId.toString();
      }
    }

    const firstOrg = await Organization.findOne().sort({ createdAt: 1 }).lean();
    if (firstOrg) {
      return firstOrg._id.toString();
    }
  } catch (err) {
    console.warn('[GmailWatcher] Could not auto-resolve organization:', err.message);
  }

  return null;
};

/**
 * Execute Gmail invoice ingestion sync with real-time status updates
 */
export const syncGmailInvoices = async (options = {}) => {
  const forceRescan = options?.forceRescan === true;
  let organizationId = options?.organizationId || null;

  if (isSyncInProgress) {
    if (syncStartTime && Date.now() - syncStartTime > 90000) {
      console.warn('[GmailWatcher] Stale sync lock (>90s) detected. Forcing lock release.');
      isSyncInProgress = false;
    } else {
      console.log('[GmailWatcher] Sync already in progress, returning active status.');
      return { status: 'in_progress', message: 'Sync already in progress', progress: getSyncProgress() };
    }
  }

  isSyncInProgress = true;
  syncStartTime = Date.now();

  // Reset progress state
  syncProgress = {
    inProgress: true,
    forceRescan,
    startedAt: Date.now(),
    totalFound: 0,
    currentIndex: 0,
    currentFilename: null,
    statusMessage: 'Connecting to Gmail API & scanning mailbox...',
    processed: 0,
    skipped: 0,
    errors: 0,
    itemsImported: 0,
    invoices: [],
    logs: [{ type: 'info', text: 'Started Gmail mailbox scan...' }],
    lastResult: null,
  };

  let org = null;
  try {
    await cleanupLegacyIndexes().catch(() => {});
    organizationId = await resolveOrganizationId(organizationId);
    if (organizationId) {
      org = await Organization.findById(organizationId).lean().catch(() => null);
    }
  } catch {
    // Continue
  }

  console.log(`[GmailWatcher] Starting Gmail invoice polling cycle (forceRescan=${forceRescan}, org=${organizationId})...`);

  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
    totalEmailsFound: 0,
    itemsImported: 0,
    invoices: [],
    details: [],
  };

  const userEmail = (options?.userEmail || '').toLowerCase().trim();
  const userAccessToken = options?.userAccessToken || null;
  const clientsToScan = [];

  if (userAccessToken) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ access_token: userAccessToken });
      const client = google.gmail({ version: 'v1', auth: oauth2Client });

      const profile = await client.users.getProfile({ userId: 'me' });
      const mailboxEmail = (profile.data?.emailAddress || '').toLowerCase().trim();

      if (userEmail && mailboxEmail && mailboxEmail !== userEmail) {
        const mismatchError = `Connected Gmail account (${mailboxEmail}) does not match your Stoqra user (${userEmail}). Please authorize with ${userEmail}.`;
        console.warn(`[GmailWatcher] Email mismatch: ${mismatchError}`);
        isSyncInProgress = false;
        syncStartTime = null;
        syncProgress.inProgress = false;
        syncProgress.statusMessage = mismatchError;
        return { status: 'error', needsAuth: true, error: mismatchError };
      }

      if (mailboxEmail) {
        await User.findOneAndUpdate(
          { email: mailboxEmail },
          { gmailConnectedEmail: mailboxEmail, lastGmailSync: new Date() }
        ).catch(() => {});
      }

      clientsToScan.push({ client, mailboxEmail: mailboxEmail || userEmail });
    } catch (authErr) {
      console.error('[GmailWatcher] Failed to verify user access token:', authErr.message);
      isSyncInProgress = false;
      syncStartTime = null;
      syncProgress.inProgress = false;
      syncProgress.statusMessage = `Gmail authorization invalid or expired: ${authErr.message}`;
      return {
        status: 'needs_authorization',
        needsAuth: true,
        error: `Gmail authorization invalid or expired: ${authErr.message}. Please click "Authorize & Sync My Gmail".`,
      };
    }
  } else {
    // No access token provided.
    // Check if user is ialksng@gmail.com or configured admin
    const isAdmin =
      userEmail === 'ialksng@gmail.com' ||
      (process.env.ADMIN_EMAILS || '').toLowerCase().includes(userEmail);

    if (isAdmin && process.env.GMAIL_REFRESH_TOKEN) {
      const refreshTokens = (process.env.GMAIL_REFRESH_TOKEN || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      for (const token of refreshTokens) {
        try {
          const client = getGmailClient(token);
          clientsToScan.push({ client, mailboxEmail: userEmail || 'ialksng@gmail.com' });
        } catch (clientErr) {
          console.warn(`[GmailWatcher] Skipping token due to auth error: ${clientErr.message}`);
        }
      }
    } else {
      // Regular user trying to sync without token: NEVER fall back to someone else's account!
      const authRequiredMsg = `Gmail authorization required for ${userEmail || 'your account'}. Please click "Authorize & Sync My Gmail".`;
      console.warn(`[GmailWatcher] Blocked unauthorized sync attempt for ${userEmail}: Needs user's own token.`);
      isSyncInProgress = false;
      syncStartTime = null;
      syncProgress.inProgress = false;
      syncProgress.statusMessage = authRequiredMsg;
      return {
        status: 'needs_authorization',
        needsAuth: true,
        error: authRequiredMsg,
      };
    }
  }

  if (clientsToScan.length === 0) {
    const errorMsg = 'No authorized Gmail account available to scan.';
    console.warn(`[GmailWatcher] Skipping poll: ${errorMsg}`);
    isSyncInProgress = false;
    syncStartTime = null;
    syncProgress.inProgress = false;
    syncProgress.statusMessage = errorMsg;
    return { status: 'skipped', reason: errorMsg };
  }

  const orgFilter = organizationId ? { organizationId } : {};

  try {
    for (const { client: gmail, mailboxEmail } of clientsToScan) {
      syncProgress.logs.unshift({
        type: 'info',
        text: `Connected to Gmail mailbox for ${mailboxEmail}. Scanning for invoices...`,
      });

      // 1. Clean cache if force rescan or purge transient errors
      if (forceRescan) {
        await ProcessedMail.deleteMany(orgFilter).catch(() => {});
      } else {
        await ProcessedMail.deleteMany({
          ...orgFilter,
          status: { $in: ['ERROR', 'NO_ITEMS', 'SKIPPED'] },
        }).catch(() => {});
      }

      // Query broad range of invoices
      const query = process.env.GMAIL_SEARCH_QUERY || 'has:attachment OR filename:pdf OR invoice OR bill OR purchase OR tax OR order OR receipt -in:trash -in:spam';
      syncProgress.statusMessage = 'Searching mailbox for invoice attachments...';

      let listRes = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100,
      });

      let messages = listRes.data.messages || [];

      if (messages.length === 0) {
        listRes = await gmail.users.messages.list({
          userId: 'me',
          q: 'in:inbox -in:trash -in:spam',
          maxResults: 50,
        });
        messages = listRes.data.messages || [];
      }

      results.totalEmailsFound = messages.length;
      syncProgress.totalFound = messages.length;
      syncProgress.logs.unshift({
        type: 'info',
        text: `Found ${messages.length} email(s) to inspect in mailbox.`,
      });

      let msgIndex = 0;
      for (const msgRef of messages) {
        msgIndex += 1;
        const messageId = msgRef.id;

        syncProgress.currentIndex = msgIndex;
        syncProgress.statusMessage = `Checking email ${msgIndex} of ${messages.length}...`;

        // Check if invoice already exists for this store
        const existingInvoice = await Invoice.findOne({ messageId, ...orgFilter });

        if (existingInvoice) {
          const itemSkus = (existingInvoice.items || []).map((i) => i.sku).filter(Boolean);
          const catalogCount = itemSkus.length > 0
            ? await Item.countDocuments({ sku: { $in: itemSkus }, ...orgFilter })
            : 0;

          if (catalogCount > 0 && !forceRescan) {
            results.skipped += 1;
            syncProgress.skipped += 1;
            results.details.push({
              messageId,
              invoiceNumber: existingInvoice.invoiceNumber,
              status: 'skipped',
              reason: `Invoice #${existingInvoice.invoiceNumber} already in catalog`,
            });
            continue;
          } else {
            await Invoice.deleteOne({ _id: existingInvoice._id }).catch(() => {});
          }
        }

        try {
          const msgRes = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
          });

          const pdfParts = findPdfParts(msgRes.data.payload);

          if (pdfParts.length === 0) {
            await safeRecordProcessedMail(
              { messageId, ...(organizationId && { organizationId }) },
              { $set: { messageId, organizationId: organizationId || null, status: 'SKIPPED', reason: 'no_pdf_attachment' } }
            );
            results.skipped += 1;
            syncProgress.skipped += 1;
            results.details.push({ messageId, status: 'skipped', reason: 'no_pdf_attachment' });
            continue;
          }

          let messageHasValidInvoice = false;
          let hadParseError = false;

          for (const part of pdfParts) {
            const filename = part.filename || 'invoice.pdf';
            syncProgress.currentFilename = filename;
            syncProgress.statusMessage = `Analyzing "${filename}" with Gemini AI...`;

            let pdfBuffer = null;
            if (part.body && part.body.data) {
              pdfBuffer = Buffer.from(part.body.data, 'base64url');
            } else if (part.body && part.body.attachmentId) {
              const attachmentRes = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId,
                id: part.body.attachmentId,
              });
              if (attachmentRes.data && attachmentRes.data.data) {
                pdfBuffer = Buffer.from(attachmentRes.data.data, 'base64url');
              }
            }

            if (!pdfBuffer || pdfBuffer.length === 0) continue;

            let extractedInvoice = null;
            let parseError = null;

            try {
              extractedInvoice = await parseInvoicePDF(pdfBuffer, org?.type);
            } catch (parseErr) {
              parseError = parseErr;
              hadParseError = true;
            }

            if (parseError) {
              results.errors += 1;
              syncProgress.errors += 1;
              syncProgress.logs.unshift({
                type: 'error',
                text: `Extraction error on "${filename}": ${parseError.message}`,
              });
              continue;
            }

            if (!extractedInvoice || extractedInvoice.isInvoice === false || !extractedInvoice.items || extractedInvoice.items.length === 0) {
              results.skipped += 1;
              syncProgress.skipped += 1;
              syncProgress.logs.unshift({
                type: 'info',
                text: `"${filename}" is not an inventory invoice (skipped).`,
              });
              await safeRecordProcessedMail(
                { messageId, ...(organizationId && { organizationId }) },
                { $set: { messageId, organizationId: organizationId || null, status: 'NOT_AN_INVOICE', reason: 'non_invoice_pdf' } }
              );
              continue;
            }

            // Check if already in live Invoices or already staged
            const existingInv = await Invoice.findOne({
              invoiceNumber: extractedInvoice.invoiceNumber,
              ...(organizationId && { organizationId }),
            });
            if (existingInv) {
              results.skipped += 1;
              syncProgress.skipped += 1;
              continue;
            }

            const existingStaged = await StagedInvoice.findOne({
              invoiceNumber: extractedInvoice.invoiceNumber,
              ...(organizationId && { organizationId }),
            });
            if (existingStaged) {
              results.skipped += 1;
              syncProgress.skipped += 1;
              continue;
            }

            // Stage parsed invoice for merchant review before committing to shelf
            syncProgress.statusMessage = `Staging Invoice #${extractedInvoice.invoiceNumber} for merchant review...`;
            const stagedInvoice = await StagedInvoice.create({
              organizationId,
              messageId,
              invoiceNumber: extractedInvoice.invoiceNumber,
              vendorName: extractedInvoice.vendorName,
              invoiceDate: extractedInvoice.invoiceDate ? new Date(extractedInvoice.invoiceDate) : new Date(),
              totalAmount: extractedInvoice.totalAmount || 0,
              taxAmount: extractedInvoice.taxAmount || 0,
              items: (extractedInvoice.items || []).map((item) => ({
                name: item.name,
                sku: item.sku,
                category: item.category || org?.type || 'General',
                quantity: item.quantity || 1,
                costPrice: item.unitCost || 0,
                sellingPrice: item.sellingPrice || Math.round((item.unitCost || 0) * 1.35),
                selected: true,
              })),
              status: 'PENDING_REVIEW',
              source: 'GMAIL',
            });

            messageHasValidInvoice = true;
            results.processed += 1;
            results.itemsImported += stagedInvoice.items.length;
            results.invoices.push({
              id: stagedInvoice._id,
              invoiceNumber: stagedInvoice.invoiceNumber,
              vendor: stagedInvoice.vendorName,
              totalAmount: stagedInvoice.totalAmount,
              itemsCount: stagedInvoice.items.length,
              staged: true,
            });

            syncProgress.processed += 1;
            syncProgress.itemsImported += stagedInvoice.items.length;
            syncProgress.invoices.unshift({
              id: stagedInvoice._id,
              invoiceNumber: stagedInvoice.invoiceNumber,
              vendor: stagedInvoice.vendorName,
              totalAmount: stagedInvoice.totalAmount,
              itemsCount: stagedInvoice.items.length,
              filename,
              staged: true,
            });

            syncProgress.logs.unshift({
              type: 'success',
              text: `📦 Staged Invoice #${stagedInvoice.invoiceNumber} from "${stagedInvoice.vendorName}" (${stagedInvoice.items.length} items, ₹${Number(stagedInvoice.totalAmount || 0).toLocaleString('en-IN')}) for review`,
            });
          }

          if (messageHasValidInvoice) {
            await safeRecordProcessedMail(
              { messageId, ...(organizationId && { organizationId }) },
              {
                $set: {
                  messageId,
                  organizationId: organizationId || null,
                  status: 'PROCESSED',
                  reason: 'success',
                },
              }
            );

            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: { removeLabelIds: ['UNREAD'] },
              });
            } catch {
              // Ignore
            }
          } else if (hadParseError) {
            await safeRecordProcessedMail(
              { messageId, ...(organizationId && { organizationId }) },
              {
                $set: {
                  messageId,
                  organizationId: organizationId || null,
                  status: 'ERROR',
                  reason: 'temporary_ai_error',
                },
              }
            );
          } else {
            await safeRecordProcessedMail(
              { messageId, ...(organizationId && { organizationId }) },
              {
                $set: {
                  messageId,
                  organizationId: organizationId || null,
                  status: 'NO_ITEMS',
                  reason: 'no_inventory_items',
                },
              }
            );
          }
        } catch (msgError) {
          results.errors += 1;
          syncProgress.errors += 1;
          await safeRecordProcessedMail(
            { messageId, ...(organizationId && { organizationId }) },
            { $set: { messageId, organizationId: organizationId || null, status: 'ERROR', reason: msgError.message } }
          );
        }
      }
    }
  } catch (error) {
    console.error('[GmailWatcher] Global sync cycle failure:', error.message);
    results.status = 'error';
    results.error = error.message;
    syncProgress.logs.unshift({ type: 'error', text: `Sync failed: ${error.message}` });
  } finally {
    isSyncInProgress = false;
    syncStartTime = null;
    syncProgress.inProgress = false;
    syncProgress.statusMessage = `Completed. ${results.processed} invoice(s) imported, ${results.skipped} skipped.`;
    syncProgress.lastResult = results;
  }

  return results;
};

/**
 * Start scheduled cron job (Runs every 15 minutes)
 */
export const startGmailWatcher = () => {
  const cronExpression = '*/15 * * * *';

  if (cronTask) {
    cronTask.stop();
  }

  console.log(`[GmailWatcher] Initializing cron worker scheduled at: "${cronExpression}"`);
  cronTask = cron.schedule(cronExpression, async () => {
    try {
      const organizationId = await resolveOrganizationId(null);
      await syncGmailInvoices({ organizationId });
    } catch (err) {
      console.error('[GmailWatcher] Cron tick unhandled error:', err.message);
    }
  });

  return cronTask;
};

/**
 * Stop the cron worker
 */
export const stopGmailWatcher = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[GmailWatcher] Cron worker stopped.');
  }
};

export default {
  startGmailWatcher,
  stopGmailWatcher,
  syncGmailInvoices,
  getSyncProgress,
};
