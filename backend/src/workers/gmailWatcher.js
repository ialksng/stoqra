import cron from 'node-cron';
import mongoose from 'mongoose';
import { getGmailClient } from '../config/googleAuth.js';
import { cleanupLegacyIndexes } from '../config/db.js';
import Invoice from '../models/Invoice.js';
import Item from '../models/Item.js';
import ProcessedMail from '../models/ProcessedMail.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { parseInvoicePDF } from '../services/invoiceParser.js';
import { processRestock } from '../services/inventoryService.js';

let cronTask = null;
let isSyncInProgress = false;
let syncStartTime = null;

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
 * Supports standard attachments (attachmentId), embedded base64 data (body.data), and all PDF mime variants
 * @param {Object} payload - Gmail message payload
 * @returns {Array} List of PDF parts
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
 * @param {string|null} providedOrgId
 * @returns {Promise<string|null>}
 */
const resolveOrganizationId = async (providedOrgId) => {
  if (providedOrgId) return String(providedOrgId);

  try {
    // 1. Check admin user by email
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

    // 2. Fallback to any active organization in DB
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
 * Execute Gmail invoice ingestion sync
 * Syncs read & unread emails matching attachments and invoice queries
 * @param {Object} [options] - Sync configuration options
 * @param {boolean} [options.forceRescan] - Force re-evaluation of previously scanned emails
 * @param {string} [options.organizationId] - Scope ingested items to this organization
 * @returns {Promise<{ status?: string, processed: number, skipped: number, errors: number, totalEmailsFound: number, details: Array }>}
 */
export const syncGmailInvoices = async (options = {}) => {
  const forceRescan = options?.forceRescan === true;
  let organizationId = options?.organizationId || null;

  if (isSyncInProgress) {
    if (syncStartTime && Date.now() - syncStartTime > 90000) {
      console.warn('[GmailWatcher] Stale sync lock (>90s) detected. Forcing lock release.');
      isSyncInProgress = false;
    } else {
      console.log('[GmailWatcher] Sync already in progress, skipping concurrent trigger.');
      return { status: 'in_progress', message: 'Sync already in progress' };
    }
  }

  isSyncInProgress = true;
  syncStartTime = Date.now();

  try {
    // Drop any legacy single-field unique indexes
    await cleanupLegacyIndexes().catch(() => {});
    organizationId = await resolveOrganizationId(organizationId);
  } catch {
    // Continue
  }

  console.log(`[GmailWatcher] Starting Gmail invoice polling cycle (forceRescan=${forceRescan}, org=${organizationId})...`);

  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
    totalEmailsFound: 0,
    details: [],
  };

  const refreshTokens = (process.env.GMAIL_REFRESH_TOKEN || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (refreshTokens.length === 0) {
    const errorMsg = 'Missing Gmail OAuth credentials. Ensure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are set in .env';
    console.warn(`[GmailWatcher] Skipping poll: ${errorMsg}`);
    isSyncInProgress = false;
    syncStartTime = null;
    return { status: 'skipped', reason: errorMsg };
  }

  const orgFilter = organizationId ? { organizationId } : {};

  try {
    for (const token of refreshTokens) {
      let gmail;
      try {
        gmail = getGmailClient(token);
      } catch (clientErr) {
        console.warn(`[GmailWatcher] Skipping token due to auth error: ${clientErr.message}`);
        continue;
      }

      // 1. Clean cache if force rescan or purge transient errors for this organization
      if (forceRescan) {
        console.log(`[GmailWatcher] Force rescan active: resetting processed mail cache for org=${organizationId}...`);
        await ProcessedMail.deleteMany(orgFilter).catch(() => {});
      } else {
        await ProcessedMail.deleteMany({
          ...orgFilter,
          status: { $in: ['ERROR', 'NO_ITEMS', 'SKIPPED'] },
        }).catch(() => {});
      }

      // Broad query: all emails (read, unread) with attachments or invoice keywords
      const query = process.env.GMAIL_SEARCH_QUERY || 'has:attachment OR filename:pdf OR invoice OR bill OR purchase OR tax OR order OR receipt -in:trash -in:spam';
      console.log(`[GmailWatcher] Executing query "${query}" (max 100)...`);

      let listRes = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100,
      });

      let messages = listRes.data.messages || [];

      // Fallback: If 0 messages found with broad query, search entire inbox
      if (messages.length === 0) {
        console.log('[GmailWatcher] Checking recent inbox emails as fallback...');
        listRes = await gmail.users.messages.list({
          userId: 'me',
          q: 'in:inbox -in:trash -in:spam',
          maxResults: 50,
        });
        messages = listRes.data.messages || [];
      }

      results.totalEmailsFound = messages.length;
      console.log(`[GmailWatcher] Found ${messages.length} matching message(s) in mailbox.`);

      for (const msgRef of messages) {
        const messageId = msgRef.id;

        // 2. Org-scoped Deduplication Check
        const existingInvoice = await Invoice.findOne({ messageId, ...orgFilter });

        if (existingInvoice) {
          const itemSkus = (existingInvoice.items || []).map((i) => i.sku).filter(Boolean);
          const catalogCount = itemSkus.length > 0
            ? await Item.countDocuments({ sku: { $in: itemSkus }, ...orgFilter })
            : 0;

          if (catalogCount > 0 && !forceRescan) {
            console.log(`[GmailWatcher] Invoice #${existingInvoice.invoiceNumber} already in store catalog. Skipping duplicate.`);
            results.skipped += 1;
            results.details.push({
              messageId,
              invoiceNumber: existingInvoice.invoiceNumber,
              status: 'skipped',
              reason: `Invoice #${existingInvoice.invoiceNumber} already in catalog`,
            });
            continue;
          } else {
            console.log(`[GmailWatcher] Stale or missing invoice #${existingInvoice.invoiceNumber} found for messageId ${messageId}. Re-ingesting...`);
            await Invoice.deleteOne({ _id: existingInvoice._id }).catch(() => {});
          }
        }

        try {
          // 3. Fetch full message payload
          const msgRes = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
          });

          const pdfParts = findPdfParts(msgRes.data.payload);

          if (pdfParts.length === 0) {
            console.log(`[GmailWatcher] Message ${messageId} did not contain downloadable PDF attachments.`);
            await safeRecordProcessedMail(
              { messageId, ...(organizationId && { organizationId }) },
              { $set: { messageId, organizationId: organizationId || null, status: 'SKIPPED', reason: 'no_pdf_attachment' } }
            );
            results.skipped += 1;
            results.details.push({ messageId, status: 'skipped', reason: 'no_pdf_attachment' });
            continue;
          }

          console.log(`[GmailWatcher] Found ${pdfParts.length} PDF attachment(s) in message ${messageId}...`);

          let messageHasValidInvoice = false;
          let hadParseError = false;

          for (const part of pdfParts) {
            const filename = part.filename || 'invoice.pdf';

            // 4. Download PDF attachment into memory buffer
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

            if (!pdfBuffer || pdfBuffer.length === 0) {
              console.warn(`[GmailWatcher] Could not retrieve buffer for attachment "${filename}". Skipping.`);
              continue;
            }

            // 5. Pass buffer to Gemini PDF extraction service
            console.log(`[GmailWatcher] Extracting invoice data via Gemini from "${filename}" (${pdfBuffer.length} bytes)...`);
            let extractedInvoice = null;
            let parseError = null;

            try {
              extractedInvoice = await parseInvoicePDF(pdfBuffer);
            } catch (parseErr) {
              parseError = parseErr;
              hadParseError = true;
              console.warn(`[GmailWatcher] Gemini parse error on "${filename}":`, parseErr.message);
            }

            if (parseError) {
              results.errors += 1;
              results.details.push({
                messageId,
                filename,
                status: 'error',
                reason: parseError.message,
              });
              continue;
            }

            // If PDF contains no inventory line items, safely skip
            if (!extractedInvoice || !extractedInvoice.items || extractedInvoice.items.length === 0) {
              console.log(`[GmailWatcher] Attachment "${filename}" has no inventory line items. Skipping.`);
              results.skipped += 1;
              results.details.push({
                messageId,
                filename,
                status: 'skipped',
                reason: 'no_inventory_items',
              });
              continue;
            }

            // 6. Ingest into stock database atomically
            console.log(`[GmailWatcher] Ingesting parsed invoice "${extractedInvoice.invoiceNumber}" into stock ledger (org=${organizationId})...`);
            const restockResult = await processRestock(extractedInvoice, messageId, organizationId);

            if (restockResult.skipped) {
              console.log(`[GmailWatcher] Invoice "${extractedInvoice.invoiceNumber}" duplicate skipped: ${restockResult.reason}`);
              results.skipped += 1;
              results.details.push({
                messageId,
                filename,
                invoiceNumber: extractedInvoice.invoiceNumber,
                status: 'skipped',
                reason: restockResult.reason || 'duplicate_invoice',
              });
              continue;
            }

            messageHasValidInvoice = true;
            results.processed += 1;
            results.details.push({
              messageId,
              filename,
              invoiceNumber: extractedInvoice.invoiceNumber,
              vendor: extractedInvoice.vendorName,
              itemsCount: extractedInvoice.items.length,
              status: 'success',
              restockResult,
            });
          }

          if (messageHasValidInvoice) {
            // Mark message as processed for this store
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

            // 7. Attempt to remove UNREAD label from email
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                  removeLabelIds: ['UNREAD'],
                },
              });
              console.log(`[GmailWatcher] Removed UNREAD label from message ${messageId}`);
            } catch {
              // Non-fatal
            }
          } else if (hadParseError) {
            console.log(`[GmailWatcher] Message ${messageId} had extraction errors. Leaving eligible for retry.`);
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
          console.error(`[GmailWatcher] Error processing message ${messageId}:`, msgError.message);
          await safeRecordProcessedMail(
            { messageId, ...(organizationId && { organizationId }) },
            { $set: { messageId, organizationId: organizationId || null, status: 'ERROR', reason: msgError.message } }
          );
          results.errors += 1;
          results.details.push({
            messageId,
            status: 'error',
            error: msgError.message,
          });
        }
      }
    }
  } catch (error) {
    console.error('[GmailWatcher] Global sync cycle failure:', error.message);
    results.status = 'error';
    if (error.message.includes('unauthorized_client')) {
      results.error = 'OAuth Client Mismatch (unauthorized_client): GMAIL_REFRESH_TOKEN was created for a different Client ID than GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET. Re-generate your refresh token using your exact Client ID & Secret in OAuth Playground.';
    } else if (error.message.includes('invalid_grant')) {
      results.error = 'Token Expired/Revoked (invalid_grant): Please generate a fresh refresh token in Google OAuth Playground.';
    } else {
      results.error = error.message;
    }
  } finally {
    isSyncInProgress = false;
    syncStartTime = null;
  }

  console.log(
    `[GmailWatcher] Cycle finished. Processed: ${results.processed}, Skipped: ${results.skipped}, Errors: ${results.errors}`
  );
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
};
