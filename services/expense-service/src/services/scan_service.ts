import { CustomError, ValidationError } from "@app/shared-errors";
import { listCategories } from "./category_service";
import { sniffImageMime, SlipDraft, toDraft } from "../utils/slipDraft";

const FAILED = "Couldn't read the slip. Try again or enter it manually.";

const prompt = (categoryNames: string[]) =>
  "This is a payment slip, receipt, or mobile banking screenshot from Myanmar. Read it and answer in JSON: " +
  "amount = total paid in MMK as a number; " +
  `category = the best fit from: ${categoryNames.join(", ")}; ` +
  "paymentMethod = KBZ_PAY for KBZPay, AYA_PAY for AYA Pay, ONLINE_PAYMENT for other banking apps or cards, " +
  "CASH for paper receipts; " +
  'date = the date on the slip as YYYY-MM-DD, or "" if none; ' +
  "note = the merchant or purpose in under 60 characters, in English.";

/** Reads a base64 slip image into an expense draft. Nothing is saved. */
export async function scanSlip(
  userId: string,
  body: { image?: unknown } | undefined,
): Promise<SlipDraft> {
  const image = body?.image;
  const mime = typeof image === "string" ? sniffImageMime(image) : null;
  if (typeof image !== "string" || !mime) {
    throw new ValidationError("image must be a base64 JPEG, PNG or WebP");
  }
  const categories = await listCategories(userId);
  const answer = await askModel(
    image,
    mime,
    categories.map((c) => c.name),
  );
  // UTC+14 is the latest "today" anywhere, so a slip from today in Myanmar is never in the future.
  const latestDate = new Date(Date.now() + 14 * 3600_000)
    .toISOString()
    .slice(0, 10);
  return toDraft(answer, categories, latestDate);
}

/** The only provider-specific code (Gemini). Swap this to move to another model, e.g. Ollama. */
async function askModel(
  image: string,
  mime: string,
  categoryNames: string[],
): Promise<Record<string, unknown>> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  try {
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt(categoryNames) },
                { inline_data: { mime_type: mime, data: image } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            // The enum forces the answer onto one of the user's real categories.
            responseSchema: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                category: {
                  type: "STRING",
                  ...(categoryNames.length ? { enum: categoryNames } : {}),
                },
                paymentMethod: {
                  type: "STRING",
                  enum: ["CASH", "KBZ_PAY", "AYA_PAY", "ONLINE_PAYMENT"],
                },
                date: { type: "STRING" },
                note: { type: "STRING" },
              },
              required: ["amount", "category", "paymentMethod", "date", "note"],
            },
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const answer: unknown = JSON.parse(
      json.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    );
    if (typeof answer !== "object" || answer === null)
      throw new Error("Gemini answer is not a JSON object");
    return answer as Record<string, unknown>;
  } catch (err) {
    console.error("Slip scan failed:", err);
    throw new CustomError(FAILED, 503);
  }
}
