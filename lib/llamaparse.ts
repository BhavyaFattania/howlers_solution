/**
 * LlamaParse free-tier client. Uploads a file, polls until DONE, returns markdown.
 * Falls back to a stub demo extraction when no API key is set so the dev flow keeps working.
 */
const BASE = "https://api.cloud.llamaindex.ai/api/parsing";
const KEY = process.env.LLAMAPARSE_API_KEY;

export async function parseDocument(file: Blob, filename = "upload"): Promise<string> {
  if (!KEY) {
    if (process.env.NODE_ENV === "development") return DEMO_MARKDOWN;
    throw new Error("LlamaParse API Key is not configured.");
  }

  const fd = new FormData();
  fd.append("file", file, filename);
  fd.append("language", "en");
  fd.append("parsing_instruction", "Extract every form field, label, and handwritten note.");

  const up = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: fd,
  });
  if (!up.ok) throw new Error(`LlamaParse upload failed: ${up.status} ${await up.text()}`);
  const { id } = (await up.json()) as { id: string };

  // Poll
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const s = await fetch(`${BASE}/job/${id}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!s.ok) continue;
    const { status } = (await s.json()) as { status: string };
    if (status === "SUCCESS") {
      const r = await fetch(`${BASE}/job/${id}/result/markdown`, {
        headers: { Authorization: `Bearer ${KEY}` },
      });
      const data = (await r.json()) as { markdown: string };
      return data.markdown;
    }
    if (status === "ERROR" || status === "CANCELLED") {
      throw new Error(`LlamaParse job ${status}`);
    }
  }
  throw new Error("LlamaParse polling timeout");
}

export const DEMO_MARKDOWN = `# Community Need Survey

**Surveyor:** Field Worker — Demo
**Date:** 2026-04-28
**Location:** Sector 7, near community center, Ahmedabad
**GPS:** 23.045, 72.62

## Household Information
- Head of household: [REDACTED]
- Languages spoken: Gujarati, Hindi
- Family size: 6

## Reported Need
Distribution of relief kits requested for ~30 families affected by recent flooding.
Volunteers needed for: lifting, logistics, basic first aid.
Time window: tomorrow 8am - 6pm.
Headcount required: 6 volunteers.
Urgency: HIGH.

## Notes
Beneficiaries prefer Gujarati-speaking volunteers if possible.
`;
