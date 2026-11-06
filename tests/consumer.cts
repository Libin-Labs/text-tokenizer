import {
  tokenizeText,
  type TokenCategory,
  type TokenizerOptions,
  type TextToken,
} from '@lp-labs/text-tokenizer';
const category: TokenCategory = { name: 'currency', characters: '$€' };
const options: TokenizerOptions = { categories: [category], includeWhitespace: true };
const tokens: TextToken[] = tokenizeText('$42', options);
// @ts-expect-error source must be a string
tokenizeText(42);
// @ts-expect-error category characters must be a string
tokenizeText('a', { categories: [{ name: 'x', characters: ['a'] }] });
void tokens;
