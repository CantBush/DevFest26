import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const DEFAULT_MODEL = "gemini-3.8-flash";

let client: GoogleGenAI | null = null;

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function responseSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

export async function generateJson<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await gemini().models.generateContent({
        model: geminiModel(),
        contents: attempt === 0 ? prompt : `${prompt}\n\nThe previous reply was not valid JSON for the schema. Return only the JSON object.`,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: responseSchema(schema),
          temperature: 0.4,
        },
      });
      return schema.parse(JSON.parse(response.text ?? ""));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini returned invalid JSON.");
}

export type ResearchResult = {
  text: string;
  sources: { title: string; url: string }[];
};

function httpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Grounded research. Sources are taken only from Google Search grounding chunks.
export async function research(system: string, prompt: string): Promise<ResearchResult> {
  const response = await gemini().models.generateContent({
    model: geminiModel(),
    contents: prompt,
    config: {
      systemInstruction: system,
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const url = httpUrl(chunk.web?.uri);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: chunk.web?.title?.trim() || url, url });
  }
  return { text: response.text ?? "", sources };
}
