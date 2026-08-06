import {
  META_MAX_DEPTH,
  META_MAX_JSON_BYTES,
  META_MAX_KEYS,
  META_MAX_STRING_LENGTH,
} from './limits.ts';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return value.slice(0, META_MAX_STRING_LENGTH);
  if (isPlainObject(value) && depth < META_MAX_DEPTH) {
    return sanitizeObject(value, depth + 1);
  }
  return undefined;
}

function sanitizeObject(input: Record<string, unknown>, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, value] of Object.entries(input)) {
    if (count >= META_MAX_KEYS) break;
    const cleaned = sanitizeValue(value, depth);
    if (cleaned === undefined) continue;
    out[key] = cleaned;
    count += 1;
  }
  return out;
}

/** Bound/sanitize unbounded client `meta` (size, depth, key count). */
export function sanitizeMeta(meta: unknown): Record<string, unknown> | undefined {
  if (meta === undefined || meta === null) return undefined;
  if (!isPlainObject(meta)) return undefined;
  const cleaned = sanitizeObject(meta, 0);
  if (Object.keys(cleaned).length === 0) return undefined;
  const json = JSON.stringify(cleaned);
  if (json.length > META_MAX_JSON_BYTES) return undefined;
  return cleaned;
}
