import { GoogleGenAI } from '@google/genai';

/**
 * Initialize Google GenAI client
 */
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('[Gemini Config] Warning: GEMINI_API_KEY is not defined in environment variables. Invoice parsing calls will fail until configured.');
}

export const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key',
});

let rawModel = (process.env.GEMINI_MODEL || '').trim();
// Automatically alias legacy or deprecated models to active gemini-3.5-flash-lite
if (!rawModel || /^gemini-(1\.5|2\.0)/i.test(rawModel) || !/^gemini-(2\.5|3\.[0-9])/i.test(rawModel)) {
  rawModel = 'gemini-3.5-flash-lite';
}
export const DEFAULT_GEMINI_MODEL = rawModel;

export default ai;
