const URL_PATTERN = /\bhttps?:\/\/\S+/gi;

export function stripUrls(text: string): string {
  return text
    .replace(URL_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

export function stripUrlsDeep<T>(value: T): T {
  if (typeof value === "string") return stripUrls(value) as T;
  if (Array.isArray(value)) return value.map((item) => stripUrlsDeep(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, stripUrlsDeep(item)])) as T;
  }
  return value;
}

export function isIsoDate(value: string | undefined): value is string {
  return value != null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function labelEstimate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = stripUrls(text);
  if (!cleaned) return undefined;
  if (/\b(about|ai estimate)\b/i.test(cleaned)) return cleaned;
  return `About ${cleaned} (AI estimate)`;
}
