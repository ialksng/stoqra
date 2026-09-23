import { Type } from '@google/genai';
import { ai } from '../config/gemini.js';

/**
 * Invoice JSON extraction schema definition
 */
export const invoiceExtractionSchema = {
  type: Type.OBJECT,

  properties: {
    isInvoice: {
      type: Type.BOOLEAN,
      description:
        'True if document is a purchase invoice, sales bill, receipt, or commercial tax invoice; False if document is an offer letter, certificate, resume, academic article, report, or non-invoice PDF',
    },

    invoiceNumber: {
      type: Type.STRING,
      description:
        'Unique invoice identifier or invoice number from the document',
    },

    vendorName: {
      type: Type.STRING,
      description:
        'Name of the vendor, supplier, or issuing company',
    },

    totalAmount: {
      type: Type.NUMBER,
      description:
        'Total payable invoice amount',
    },

    items: {
      type: Type.ARRAY,
      description:
        'List of line items purchased in this invoice',

      items: {
        type: Type.OBJECT,

        properties: {
          sku: {
            type: Type.STRING,
            description:
              'Item stock keeping unit (SKU), HSN/SAC code, part number, or product code. If absent, synthesize a clean SKU identifier from the product name.',
          },

          name: {
            type: Type.STRING,
            description:
              'Full product or service name description',
          },

          quantity: {
            type: Type.NUMBER,
            description:
              'Quantity delivered or purchased',
          },

          unitCost: {
            type: Type.NUMBER,
            description:
              'Unit price or cost paid per item',
          },

          category: {
            type: Type.STRING,
            description:
              'Product category classification such as Electronics, Hardware, FMCG, Raw Materials, Apparel, Office Supplies, Services, or General',
          },
        },

        required: [
          'sku',
          'name',
          'quantity',
          'unitCost',
        ],
      },
    },
  },

  required: [
    'isInvoice',
    'invoiceNumber',
    'vendorName',
    'totalAmount',
    'items',
  ],
};

/**
 * Gemini model queue.
 *
 * GEMINI_MODEL can be specified in .env.
 *
 * Recommended:
 * GEMINI_MODEL=gemini-3.8-flash
 */
const getModelQueue = () => {
  let customModel = (process.env.GEMINI_MODEL || '').trim();
  if (customModel && (/^gemini-(1\.5|2\.0|2\.5-pro)/i.test(customModel) || !/^gemini-(2\.5|3\.[0-9])/i.test(customModel))) {
    customModel = 'gemini-3.5-flash-lite';
  }

  const models = [
    customModel || null,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash',
  ].filter(Boolean);

  return [...new Set(models)];
};

/**
 * Delay helper
 */
const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Promise timeout helper
 */
const withTimeout = (promise, ms = 45000) => {
  return Promise.race([
    promise,

    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Timeout: PDF extraction took longer than ${ms / 1000
            }s`
          )
        );
      }, ms);
    }),
  ]);
};

/**
 * Parse a PDF invoice buffer using Google Gemini.
 *
 * Uses structured JSON output and automatically retries
 * temporary failures.
 *
 * @param {Buffer} pdfBuffer - PDF file buffer
 *
 * @returns {Promise<{
 *   isInvoice: boolean,
 *   invoiceNumber: string,
 *   vendorName: string,
 *   totalAmount: number,
 *   items: Array<{
 *     sku: string,
 *     name: string,
 *     quantity: number,
 *     unitCost: number,
 *     category: string
 *   }>
 * }>}
 */
export const parseInvoicePDF = async (pdfBuffer) => {
  /**
   * Validate PDF buffer
   */
  if (
    !pdfBuffer ||
    !Buffer.isBuffer(pdfBuffer) ||
    pdfBuffer.length === 0
  ) {
    throw new Error(
      'Invalid or empty PDF buffer supplied to parseInvoicePDF'
    );
  }

  /**
   * Convert PDF to Base64
   */
  const base64Data = pdfBuffer.toString('base64');

  /**
   * Invoice extraction prompt
   */
  const prompt = `
You are an automated invoice parsing engine specialized in
commercial and Indian GST Tax Invoices.

Analyze this PDF carefully.

1. Determine whether the document is:
   - a commercial purchase invoice
   - sales bill
   - store receipt
   - GST tax invoice

2. If it is NOT an invoice, such as:
   - offer letter
   - internship letter
   - certificate
   - resume
   - stock trade confirmation / trading statement / demat details
   - bank account statement / transaction advice / payment transfer slip
   - academic article
   - report
   - general reading document

   set:
   isInvoice = false
   items = []

3. If it IS a valid invoice:

   isInvoice:
   true

   invoiceNumber:
   Extract the unique invoice or bill number.
   Examples:
   INV-10023
   GST/24-25/001

   vendorName:
   Extract the supplier or business entity issuing
   the invoice.

   totalAmount:
   Extract the final total payable amount in INR.
   Include applicable CGST, SGST, and IGST.

   items:
   Extract EVERY line item from the invoice.

   For each item extract:
   - SKU, HSN/SAC code, part number, or product code
   - product name/description
   - quantity
   - unit cost
   - product category

4. Use sensible categories such as:
   Electronics
   Hardware
   FMCG
   Raw Materials
   Apparel
   Office Supplies
   Software
   Services
   General

5. Important:
   - Do not skip invoice line items.
   - Do not confuse subtotal with final total.
   - Do not include currency symbols in numerical values.
   - Quantities and amounts must be numerical.
   - If SKU/product code is unavailable, create a clean SKU
     based on the product name.
   - Do not invent invoice information that is clearly absent.
`;


  /**
   * Get model fallback queue
   */
  const modelsToTry = getModelQueue();

  let lastError = null;

  /**
   * Try each Gemini model
   */
  for (const modelName of modelsToTry) {
    /**
     * Try each model twice for temporary failures
     */
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `[InvoiceParser] Attempting PDF extraction using model "${modelName}" (attempt ${attempt}/2)...`
        );

        /**
         * Send PDF to Gemini
         */
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

              {
                text: prompt,
              },
            ],

            config: {
              responseMimeType: 'application/json',
              responseSchema: invoiceExtractionSchema,
            },
          }),

          25000
        );

        /**
         * Get Gemini response text
         */
        const outputText = response.text;

        if (!outputText) {
          throw new Error(
            'Gemini returned an empty text response for PDF parsing'
          );
        }

        /**
         * Clean JSON response
         *
         * Gemini structured output should normally already
         * be JSON, but this protects against Markdown wrappers.
         */
        let cleanJson = outputText.trim();

        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '');
        }

        /**
         * Parse JSON
         */
        const parsed = JSON.parse(cleanJson);

        /**
         * Document is not an invoice
         */
        if (parsed.isInvoice === false) {
          console.log(
            `[InvoiceParser] Document classified as non-invoice by model "${modelName}".`
          );

          return {
            isInvoice: false,
            invoiceNumber: '',
            vendorName: '',
            totalAmount: 0,
            items: [],
          };
        }

        /**
         * Sanitize extracted invoice data
         */
        const sanitized = {
          isInvoice: true,

          invoiceNumber: String(
            parsed.invoiceNumber ||
            `INV-${Date.now()}`
          ).trim(),

          vendorName: String(
            parsed.vendorName ||
            'Unknown Vendor'
          ).trim(),

          totalAmount:
            Number(parsed.totalAmount) || 0,

          items: Array.isArray(parsed.items)
            ? parsed.items.map((item, idx) => ({
              sku: String(
                item.sku ||
                `SKU-${idx + 1}`
              )
                .trim()
                .toUpperCase(),

              name: String(
                item.name ||
                `Item ${idx + 1}`
              ).trim(),

              quantity: Math.max(
                0,
                Number(item.quantity) || 1
              ),

              unitCost: Math.max(
                0,
                Number(item.unitCost) || 0
              ),

              category: String(
                item.category ||
                'General'
              ).trim(),
            }))
            : [],
        };

        /**
         * Successful extraction
         */
        console.log(
          `[InvoiceParser] Successfully parsed invoice #${sanitized.invoiceNumber} using "${modelName}" (${sanitized.items.length} items found).`
        );

        return sanitized;

      } catch (error) {
        lastError = error;

        const errMsg =
          error?.message ||
          String(error);

        /**
         * Detect temporary errors
         */
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Timeout');

        /**
         * Detect invalid/unsupported model
         */
        const isModelError =
          errMsg.includes('not found') ||
          errMsg.includes('NOT_FOUND') ||
          errMsg.includes('404') ||
          errMsg.includes('unsupported');

        console.warn(
          `[InvoiceParser] Model "${modelName}" attempt ${attempt} failed: ${errMsg}`
        );

        /**
         * Model does not exist or is unsupported.
         * Immediately move to next model.
         */
        if (isModelError) {
          break;
        }

        /**
         * Retry temporary failure once.
         */
        if (isTransient && attempt === 1) {
          console.log(
            `[InvoiceParser] Temporary failure. Retrying "${modelName}" in 1.5 seconds...`
          );

          await delay(1500);
          continue;
        }

        /**
         * Move to next model
         */
        break;
      }
    }
  }

  /**
   * All models failed
   */
  console.error(
    '[InvoiceParser] All candidate models failed for PDF extraction.'
  );

  throw new Error(
    `Failed to extract invoice data with Gemini: ${lastError?.message ||
    'Unknown error'
    }`
  );
};

/**
 * Default export
 */
export default {
  parseInvoicePDF,
  invoiceExtractionSchema,
};