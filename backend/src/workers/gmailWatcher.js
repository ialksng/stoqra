import cron from 'node-cron';
import { getGmailClient } from '../config/googleAuth.js';
import Invoice from '../models/Invoice.js';
import ProcessedMail from '../models/ProcessedMail.js';
import { parseInvoicePDF } from '../services/invoiceParser.js';
import { processRestock } from '../services/inventoryService.js';

let cronTask = null;
let isSyncInProgress = false;

/**
 * Recursively find all PDF attachment parts in a Gmail message payload
 * Supports both standard attachments (attachmentId) and embedded base64 data (body.data)
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
      (mime === 'application/octet-stream' && filename.endsWith('.pdf'));

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
 * Execute Gmail invoice ingestion sync
 * @returns {Promise<{ processed: number, skipped: number, errors: number, details: Array }>}
 */
export const syncGmailInvoices = async () => {
  if (isSyncInProgress) {
    console.log('[GmailWatcher] Sync already in progress, skipping concurrent trigger.');
    return { status: 'in_progress', message: 'Sync already in progress' };
  }

  isSyncInProgress = true;
  console.log('[GmailWatcher] Starting Gmail invoice polling cycle...');

  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
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
    return { status: 'skipped', reason: errorMsg };
  }

  try {
    for (const token of refreshTokens) {
      let gmail;
      try {
        gmail = getGmailClient(token);
      } catch (clientErr) {
        console.warn(`[GmailWatcher] Skipping token due to auth error: ${clientErr.message}`);
        continue;
      }

      // Search query for PDF attachments across mailbox (read and unread, all categories, excluding trash/spam)
      const query = process.env.GMAIL_SEARCH_QUERY || 'has:attachment filename:pdf -in:trash -in:spam';
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 25,
      });

      const messages = listRes.data.messages || [];
      console.log(`[GmailWatcher] Found ${messages.length} matching message(s) in INBOX.`);

      for (const msgRef of messages) {
        const messageId = msgRef.id;

        // 1. Deduplication check: verify if messageId was already successfully processed or duplicate
        const alreadyProcessed =
          (await Invoice.findOne({ messageId })) ||
          (await ProcessedMail.findOne({
            messageId,
            status: { $in: ['PROCESSED', 'DUPLICATE'] },
          }));

        if (alreadyProcessed) {
          console.log(`[GmailWatcher] Message ${messageId} already processed. Skipping.`);
          results.skipped += 1;
          results.details.push({
            messageId,
            status: 'skipped',
            reason: alreadyProcessed.reason || 'already_processed',
          });
          continue;
        }

        try {
          // 2. Fetch full message payload
          const msgRes = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
          });

          const pdfParts = findPdfParts(msgRes.data.payload);

          if (pdfParts.length === 0) {
            console.log(`[GmailWatcher] Message ${messageId} did not contain downloadable PDF attachments.`);
            await ProcessedMail.updateOne(
              { messageId },
              { messageId, status: 'SKIPPED', reason: 'no_pdf_attachment' },
              { upsert: true }
            );
            results.skipped += 1;
            results.details.push({ messageId, status: 'skipped', reason: 'no_pdf_attachment' });
            continue;
          }

          console.log(`[GmailWatcher] Processing ${pdfParts.length} PDF(s) in message ${messageId}...`);

          let messageHasValidInvoice = false;

          for (const part of pdfParts) {
            // 3. Download PDF attachment into memory buffer (either direct data or via attachment API)
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
              console.warn(`[GmailWatcher] Could not retrieve buffer for attachment "${part.filename}". Skipping.`);
              continue;
            }

            // 4. Pass buffer to Gemini PDF extraction service
            console.log(`[GmailWatcher] Extracting invoice data via Gemini from "${part.filename}" (${pdfBuffer.length} bytes)...`);
            let extractedInvoice = null;
            try {
              extractedInvoice = await parseInvoicePDF(pdfBuffer);
            } catch (parseErr) {
              console.warn(`[GmailWatcher] Gemini parse error on "${part.filename}":`, parseErr.message);
            }

            // If PDF contains no inventory line items (e.g. non-invoice PDF), safely skip
            if (!extractedInvoice || !extractedInvoice.items || extractedInvoice.items.length === 0) {
              console.log(`[GmailWatcher] Attachment "${part.filename}" has no inventory items. Skipping.`);
              results.skipped += 1;
              results.details.push({
                messageId,
                filename: part.filename,
                status: 'skipped',
                reason: 'no_inventory_items',
              });
              continue;
            }

            // 5. Ingest into stock database atomically
            console.log(`[GmailWatcher] Ingesting parsed invoice "${extractedInvoice.invoiceNumber}" into stock ledger...`);
            const restockResult = await processRestock(extractedInvoice, messageId);

            if (restockResult.skipped) {
              console.log(`[GmailWatcher] Invoice "${extractedInvoice.invoiceNumber}" duplicate skipped: ${restockResult.reason}`);
              results.skipped += 1;
              results.details.push({
                messageId,
                filename: part.filename,
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
              filename: part.filename,
              invoiceNumber: extractedInvoice.invoiceNumber,
              itemsCount: extractedInvoice.items.length,
              status: 'success',
              restockResult,
            });
          }

          // Mark message as processed in ProcessedMail cache to avoid future re-scans
          await ProcessedMail.updateOne(
            { messageId },
            {
              messageId,
              status: messageHasValidInvoice ? 'PROCESSED' : 'NO_ITEMS',
              reason: messageHasValidInvoice ? 'success' : 'no_inventory_items',
            },
            { upsert: true }
          );

          // 6. Attempt to remove UNREAD label from message if present
          try {
            await gmail.users.messages.modify({
              userId: 'me',
              id: messageId,
              requestBody: {
                removeLabelIds: ['UNREAD'],
              },
            });
            console.log(`[GmailWatcher] Cleaned UNREAD label from message ${messageId}`);
          } catch (labelErr) {
            // Already read or label modification not permitted
          }
        } catch (msgError) {
          console.error(`[GmailWatcher] Error processing message ${messageId}:`, msgError.message);
          await ProcessedMail.updateOne(
            { messageId },
            { messageId, status: 'ERROR', reason: msgError.message },
            { upsert: true }
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
  }

  console.log(
    `[GmailWatcher] Cycle finished. Processed: ${results.processed}, Skipped: ${results.skipped}, Errors: ${results.errors}`
  );
  return results;
};

/**
 * Start scheduled cron job (Runs every 15 minutes: * /15 * * * *)
 */
export const startGmailWatcher = () => {
  const cronExpression = '*/15 * * * *';

  if (cronTask) {
    cronTask.stop();
  }

  console.log(`[GmailWatcher] Initializing cron worker scheduled at: "${cronExpression}"`);
  cronTask = cron.schedule(cronExpression, async () => {
    try {
      await syncGmailInvoices();
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
