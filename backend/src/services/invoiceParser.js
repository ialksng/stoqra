import { Type } from '@google/genai';
import { ai, DEFAULT_GEMINI_MODEL } from '../config/gemini.js';

/**
 * Invoice JSON extraction schema definition
 */
export const invoiceExtractionSchema = {
  type: Type.OBJECT,
  properties: {
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
        },
        required: ['sku', 'name', 'quantity', 'unitCost'],
      },
    },
  },
  required: ['invoiceNumber', 'vendorName', 'totalAmount', 'items'],
};

/**
 * Multi-model fallback list in order of preference
 */
const getModelQueue = () => {
  const models = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ].filter(Boolean);

  return [...new Set(models)];
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse a PDF invoice buffer using Google GenAI (Gemini) structured output
 * Automatically retries with backoff and falls back across models on 503/429 spikes.
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{ invoiceNumber: string, vendorName: string, totalAmount: number, items: Array<{ sku: string, name: string, quantity: number, unitCost: number }> }>}
 */
export const parseInvoicePDF = async (pdfBuffer) => {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error('Invalid or empty PDF buffer supplied to parseInvoicePDF');
  }

  const base64Data = pdfBuffer.toString('base64');
  const prompt = `You are an automated invoice parsing engine specialized in commercial and Indian GST Tax Invoices.
Extract all structured data from this PDF invoice with high accuracy:
- invoiceNumber: Unique invoice or bill number (e.g. INV-10023, GST/24-25/001)
- vendorName: Name of the supplier or business entity issuing the invoice
- totalAmount: Final total payable invoice amount in Rupees/INR (including applicable CGST, SGST, IGST)
- items: Extract every line item with its SKU (or HSN/SAC code / product code), clear item description, quantity delivered, and unit cost.
Ensure all amounts and quantities are positive numerical values without currency symbols.`;

  const modelsToTry = getModelQueue();
  let lastError = null;

  for (const modelName of modelsToTry) {
    // Up to 2 attempts per model (for momentary 503 spikes)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[InvoiceParser] Attempting PDF extraction using model "${modelName}" (attempt ${attempt}/2)...`);

        const response = await ai.models.generateContent({
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
        });

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

        // Validate and sanitize data
        const sanitized = {
          invoiceNumber: String(parsed.invoiceNumber || `INV-${Date.now()}`).trim(),
          vendorName: String(parsed.vendorName || 'Unknown Vendor').trim(),
          totalAmount: Number(parsed.totalAmount) || 0,
          items: Array.isArray(parsed.items)
            ? parsed.items.map((item, idx) => ({
                sku: String(item.sku || `SKU-${idx + 1}`).trim().toUpperCase(),
                name: String(item.name || `Item ${idx + 1}`).trim(),
                quantity: Math.max(0, Number(item.quantity) || 1),
                unitCost: Math.max(0, Number(item.unitCost) || 0),
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
          errMsg.includes('RESOURCE_EXHAUSTED');

        console.warn(
          `[InvoiceParser] Model "${modelName}" attempt ${attempt} failed: ${errMsg}`
        );

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
