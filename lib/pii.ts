/** Demo-grade PII redaction. Production swaps this for Cloud DLP. */
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "phone", re: /\b(?:\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g },
  { name: "email", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi },
  { name: "aadhaar", re: /\b\d{4}\s?\d{4}\s?\d{4}\b/g },
  { name: "pan", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
];

export function redactPII(text: string): string {
  let out = text;
  for (const { name, re } of PATTERNS) {
    out = out.replace(re, `[${name.toUpperCase()}_REDACTED]`);
  }
  return out;
}
