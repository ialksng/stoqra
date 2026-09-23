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
// Automatically alias legacy or deprecated 1.5 models to active 2.5-flash
if (!rawModel || /^gemini-1\.5/i.test(rawModel) || !/^gemini-(2\.0|2\.5)-(flash|pro)/i.test(rawModel)) {
  rawModel = 'gemini-2.5-flash';
}
export const DEFAULT_GEMINI_MODEL = rawModel;

export default ai;
