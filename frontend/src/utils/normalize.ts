/**
 * Deep-convert raw form strings to numbers before saving. Numeric-looking
 * strings (and "") become numbers; other text (e.g. "Lithium-Ion") is kept.
 * Pair with inputs that store the raw string while typing.
 */
export function normalizeNumbers<T>(value: T): T {
  const walk = (o: unknown): unknown => {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)]));
    if (typeof o === "string" && (o.trim() === "" || !isNaN(Number(o)))) return Number(o) || 0;
    return o;
  };
  return walk(value) as T;
}
