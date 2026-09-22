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
 * Parse a PDF invoice buffer using Google GenAI (Gemini) structured output
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{ invoiceNumber: string, vendorName: string, totalAmount: number, items: Array<{ sku: string, name: string, quantity: number, unitCost: number }> }>}
 */
export const parseInvoicePDF = async (pdfBuffer) => {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error('Invalid or empty PDF buffer supplied to parseInvoicePDF');
  }

  try {
    const base64Data = pdfBuffer.toString('base64');

    const prompt = `You are an automated invoice parsing engine.
Extract all structured data from this PDF invoice with high accuracy:
- invoiceNumber (e.g. INV-10023)
- vendorName (the company issuing the invoice)
- totalAmount (the final total charged)
- items: extract every single line item with its SKU (or model/part code), clear item name, integer or decimal quantity, and unit cost.
Ensure all numbers are positive numerical values.`;

    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
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

    return sanitized;
  } catch (error) {
    console.error('[InvoiceParser] Gemini extraction failed:', error.message);
    throw new Error(`Failed to extract invoice data with Gemini: ${error.message}`);
  }
};

export default { parseInvoicePDF, invoiceExtractionSchema };
