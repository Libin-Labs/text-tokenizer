export interface TokenCategory {
  name: string;
  characters: string;
}
export interface TokenizerOptions {
  categories?: readonly TokenCategory[];
  quotes?: readonly string[];
  includeWhitespace?: boolean;
  maxInput?: number;
  maxTokens?: number;
}
export interface TextToken {
  kind: string;
  raw: string;
  value: string;
  start: number;
  end: number;
}
/** Offsets are half-open UTF-16 indices, while scanning proceeds by code point. */
export function tokenizeText(text: string, options: TokenizerOptions = {}): TextToken[] {
  const { maxInput = 100_000, maxTokens = 10_000 } = options;
  for (const n of [maxInput, maxTokens])
    if (!Number.isSafeInteger(n) || n < 1) throw new RangeError('Invalid budget.');
  if (
    typeof text !== 'string' ||
    text.length > maxInput ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)
  )
    throw new TypeError('Invalid or oversized text.');
  const categories = options.categories ?? [];
  if (!Array.isArray(categories) || categories.length > 64)
    throw new TypeError('At most 64 categories.');
  const map = new Map<string, string>();
  const names = new Set(['quoted', 'letter', 'number', 'whitespace', 'punctuation', 'other']);
  let categoryUnits = 0;
  for (const category of categories) {
    if (
      !category ||
      typeof category.name !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,63}$/u.test(category.name) ||
      names.has(category.name) ||
      typeof category.characters !== 'string' ||
      !category.characters.length
    )
      throw new TypeError('Invalid or duplicate category.');
    categoryUnits += category.characters.length;
    if (categoryUnits > 10_000) throw new RangeError('Category character budget exceeded.');
    names.add(category.name);
    for (const point of category.characters) {
      if (map.has(point)) throw new TypeError('Overlapping categories.');
      map.set(point, category.name);
    }
  }
  const quoteInput = options.quotes ?? ['"', "'"];
  if (!Array.isArray(quoteInput) || quoteInput.length > 16)
    throw new TypeError('Invalid quote list.');
  const quotes = new Set<string>();
  for (const quote of quoteInput) {
    if (
      typeof quote !== 'string' ||
      [...quote].length !== 1 ||
      /[\s\\\u0000-\u001f\u007f]/u.test(quote) ||
      quotes.has(quote)
    )
      throw new TypeError('Quotes must be unique nonwhitespace code points.');
    quotes.add(quote);
  }
  const kind = (point: string): string =>
    map.get(point) ??
    (/\s/u.test(point)
      ? 'whitespace'
      : /[\p{L}\p{M}]/u.test(point)
        ? 'letter'
        : /\p{N}/u.test(point)
          ? 'number'
          : /\p{P}/u.test(point)
            ? 'punctuation'
            : 'other');
  const result: TextToken[] = [];
  let offset = 0;
  while (offset < text.length) {
    const start = offset;
    const first = String.fromCodePoint(text.codePointAt(offset)!);
    let value = '';
    let category: string;
    if (quotes.has(first)) {
      category = 'quoted';
      offset += first.length;
      let closed = false;
      while (offset < text.length) {
        const point = String.fromCodePoint(text.codePointAt(offset)!);
        offset += point.length;
        if (point === first) {
          closed = true;
          break;
        }
        if (point === '\\') {
          if (offset >= text.length) throw new SyntaxError('Dangling quote escape.');
          const escaped = String.fromCodePoint(text.codePointAt(offset)!);
          if (escaped !== first && escaped !== '\\')
            throw new SyntaxError('Only quote and backslash escapes supported.');
          value += escaped;
          offset += escaped.length;
        } else value += point;
      }
      if (!closed) throw new SyntaxError('Unterminated quote.');
    } else {
      category = kind(first);
      do {
        const point = String.fromCodePoint(text.codePointAt(offset)!);
        if (quotes.has(point) || kind(point) !== category) break;
        value += point;
        offset += point.length;
      } while (offset < text.length);
    }
    if (category === 'whitespace' && !options.includeWhitespace) continue;
    if (result.length >= maxTokens) throw new RangeError('Token budget exceeded.');
    result.push({ kind: category, raw: text.slice(start, offset), value, start, end: offset });
  }
  return result;
}
