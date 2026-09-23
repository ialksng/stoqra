import { Type } from '@google/genai';
import { ai, DEFAULT_GEMINI_MODEL } from '../config/gemini.js';

/**
 * Invoice JSON extraction schema definition
 */
export const invoiceExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    isInvoice: {
      type: Type.BOOLEAN,
      description: 'True if document is a purchase invoice, sales bill, receipt, or commercial tax invoice; False if document is an offer letter, certificate, resume, academic article, report, or non-invoice PDF',
    },
    invoiceNumber: {
      type: Type.STRING,
      description: 'Unique invoice identifier or invoice number from the document',
    },
    vendorName: {
      type: Type.STRING,
      description: 'Name of the vendor, supplier, or issuing company',
    },
    totalAmount: {
      type: Type.NUMBER,
      description: 'Total payable invoice amount',
    },
    items: {
      type: Type.ARRAY,
      description: 'List of line items purchased in this invoice',
      items: {
        type: Type.OBJECT,
        properties: {
          sku: {
            type: Type.STRING,
            description: 'Item stock keeping unit (SKU) or part number. If absent, synthesize a clean SKU identifier from the product name.',
          },
          name: {
            type: Type.STRING,
            description: 'Full product or service name description',
          },
          quantity: {
            type: Type.NUMBER,
            description: 'Quantity delivered/purchased',
          },
          unitCost: {
            type: Type.NUMBER,
            description: 'Unit price/cost paid per item',
          },
          category: {
            type: Type.STRING,
            description: 'Product category classification (e.g. Electronics, Hardware, FMCG, Raw Materials, Apparel, Office Supplies, General)',
          },
        },
        required: ['sku', 'name', 'quantity', 'unitCost'],
      },
    },
  },
  required: ['isInvoice', 'invoiceNumber', 'vendorName', 'totalAmount', 'items'],
};

/**
 * Multi-model fallback list in order of preference
 */
const getModelQueue = () => {
  let customModel = (process.env.GEMINI_MODEL || '').trim();
  // Automatically alias legacy or deprecated 1.5 models to active 2.5-flash
  if (customModel && (/^gemini-1\.5/i.test(customModel) || !/^gemini-(2\.0|2\.5)-(flash|pro)/i.test(customModel))) {
    customModel = 'gemini-2.5-flash';
  }
  const models = [
    customModel || null,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.0-flash-lite',
  ].filter(Boolean);

  return [...new Set(models)];
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms = 25000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: PDF extraction took longer than ${ms / 1000}s`)), ms)
    ),
  ]);
};

/**
 * Parse a PDF invoice buffer using Google GenAI (Gemini) structured output
 * Automatically retries with backoff and falls back across models on 503/429 spikes.
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{ isInvoice: boolean, invoiceNumber: string, vendorName: string, totalAmount: number, items: Array<{ sku: string, name: string, quantity: number, unitCost: number, category: string }> }>}
 */
export const parseInvoicePDF = async (pdfBuffer) => {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error('Invalid or empty PDF buffer supplied to parseInvoicePDF');
  }

  const base64Data = pdfBuffer.toString('base64');
  const prompt = `You are an automated invoice parsing engine specialized in commercial and Indian GST Tax Invoices.
Analyze this document carefully:
1. Determine if it is a commercial purchase invoice, bill, receipt, or tax invoice.
2. If it is NOT an invoice (e.g. it is an offer letter, internship letter, certificate, resume, academic article, report, or general reading document), set isInvoice to false and items to [].
3. If it IS a valid invoice:
   - set isInvoice: true
   - invoiceNumber: Unique invoice or bill number (e.g. INV-10023, GST/24-25/001)
   - vendorName: Name of the supplier or business entity issuing the invoice
   - totalAmount: Final total payable invoice amount in Rupees/INR (including applicable CGST, SGST, IGST)
   - items: Extract every line item with its SKU (or HSN/SAC code / product code), clear item description, quantity delivered, unit cost, and a sensible product category (e.g. Electronics, Raw Materials, FMCG, Hardware, Apparel, Office Supplies, General).
Ensure all amounts and quantities are positive numerical values without currency symbols.`;

  const modelsToTry = getModelQueue();
  let lastError = null;

  for (const modelName of modelsToTry) {
    // Up to 2 attempts per model (for momentary 503 spikes)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[InvoiceParser] Attempting PDF extraction using model "${modelName}" (attempt ${attempt}/2)...`);

        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: invoiceExtractionSchema,
            },
          }),
          25000
        );

        const outputText = response.text;
        if (!outputText) {
          throw new Error('Gemini returned an empty text response for PDF parsing');
        }

        // Parse JSON and clean any potential wrappers
        let cleanJson = outputText.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanJson);

        if (parsed.isInvoice === false) {
          console.log(`[InvoiceParser] Document classified as non-invoice by model "${modelName}".`);
          return {
            isInvoice: false,
            invoiceNumber: '',
            vendorName: '',
            totalAmount: 0,
            items: [],
          };
        }

        // Validate and sanitize data
        const sanitized = {
          isInvoice: true,
          invoiceNumber: String(parsed.invoiceNumber || `INV-${Date.now()}`).trim(),
          vendorName: String(parsed.vendorName || 'Unknown Vendor').trim(),
          totalAmount: Number(parsed.totalAmount) || 0,
          items: Array.isArray(parsed.items)
            ? parsed.items.map((item, idx) => ({
                sku: String(item.sku || `SKU-${idx + 1}`).trim().toUpperCase(),
                name: String(item.name || `Item ${idx + 1}`).trim(),
                quantity: Math.max(0, Number(item.quantity) || 1),
                unitCost: Math.max(0, Number(item.unitCost) || 0),
                category: String(item.category || 'General').trim(),
              }))
            : [],
        };

        console.log(`[InvoiceParser] Successfully parsed invoice #${sanitized.invoiceNumber} using "${modelName}" (${sanitized.items.length} items found).`);
        return sanitized;
      } catch (error) {
        lastError = error;
        const errMsg = error.message || '';
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Timeout');

        console.warn(
          `[InvoiceParser] Model "${modelName}" attempt ${attempt} failed: ${errMsg}`
        );

        // If model doesn't exist or is not supported (404/NOT_FOUND), don't retry attempt 2
        if (
          errMsg.includes('not found') ||
          errMsg.includes('NOT_FOUND') ||
          errMsg.includes('404') ||
          errMsg.includes('unsupported')
        ) {
          break;
        }

        if (isTransient && attempt === 1) {
          // Wait 1.5s before second attempt on same model
          await delay(1500);
          continue;
        }

        // Otherwise break and try next fallback model
        break;
      }
    }
  }

  console.error('[InvoiceParser] All candidate models failed for PDF extraction.');
  throw new Error(`Failed to extract invoice data with Gemini: ${lastError?.message || 'Unknown error'}`);
};

export default { parseInvoicePDF, invoiceExtractionSchema };
