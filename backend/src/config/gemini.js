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

const rawModel = (process.env.GEMINI_MODEL || '').trim();
const isValidModel = /^gemini-(1\.5|2\.0|2\.5)-(flash|pro)/i.test(rawModel);
export const DEFAULT_GEMINI_MODEL = isValidModel ? rawModel : 'gemini-2.5-flash';

export default ai;
