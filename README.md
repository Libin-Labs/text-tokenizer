# @lp-labs/text-tokenizer

Bounded finite-category Unicode text tokenizer with quoted literals and UTF-16 source spans.

Standalone original implementation; zero runtime, peer, or sibling-package dependencies. Node.js 18+, ESM and CommonJS with separate declaration trees. No browser globals are accessed at import time; compiled runtime uses only standard JavaScript APIs.

## Install

```sh
npm install @lp-labs/text-tokenizer
```

## Quick start

```js
import { tokenizeText } from '@lp-labs/text-tokenizer';
const tokens = tokenizeText('A😀 "hello world" 42');
console.log(tokens.map(({ kind, value, start, end }) => ({ kind, value, start, end })));
```

CommonJS exposes the same named exports:

```cjs
const api = require('@lp-labs/text-tokenizer');
```

## Customization

```js
import { tokenizeText } from '@lp-labs/text-tokenizer';
console.log(
  tokenizeText('$€ 42', {
    categories: [{ name: 'currency', characters: '$€' }],
    quotes: [],
    includeWhitespace: true,
    maxTokens: 10,
  }),
);
```

## Semantics, limits and errors

`tokenizeText` groups adjacent code points of the same kind. Defaults are Unicode letter/mark (`letter`), Unicode number, JS whitespace, Unicode punctuation, and other. Custom `categories` (up to 64) take precedence and map an explicitly finite character set to a name. Names must match lowercase ASCII identifier syntax, must be unique, and cannot use built-in names or `quoted`. Character sets may not overlap across categories and collectively contain at most 10,000 UTF-16 units; there are no regex execution hooks or unbounded user grammars.

Default `quotes` are double and single quote, each closing with itself. Configure an array of up to 16 unique nonwhitespace/nonbackslash code points, or [] to disable quoting. Inside a quote, only backslash-backslash and backslash-that-quote are escapes; backslash-n is deliberately unsupported. Unterminated quotes, dangling escapes and unknown escapes throw SyntaxError. Literal line breaks inside a quote are retained. Quoting takes precedence over custom categories.

Every `TextToken` contains `kind`, source-exact `raw`, decoded `value`, and half-open `start/end` **UTF-16 offsets**, including quote delimiters in raw/span but not value. Scanning is by code point, not grapheme. Whitespace tokens are omitted unless `includeWhitespace` is true. Omitted tokens do not consume the output budget.

Defaults: `maxInput=100000` UTF-16 units, `maxTokens=10000`, both positive safe integers. TypeError covers malformed/sparse category/quote arrays, invalid source, unsupported controls or category conflicts; RangeError covers budgets. No result truncation: excess output throws. Arrays/tokens are fresh and options are neither retained nor mutated. Work/storage are O(input + configured characters + tokens), subject to JS string-building costs. This is not a full language lexer.

## Complete public declaration API

The following is the complete public ESM declaration surface; CommonJS has matching declarations and runtime exports. Optional properties are omitted rather than supplied as undefined under exactOptionalPropertyTypes.

```ts
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
export declare function tokenizeText(text: string, options?: TokenizerOptions): TextToken[];
```

## Development and verification

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run build
npm run typecheck
npm test
npm run format:check
```

The offline command requires the dev tools already present in npm's cache. TypeScript ^5.9.3 and Prettier ^3.6.2 are dev-only. Build targets ES2022 with strict NodeNext declarations, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noUnused checks, ES2022/DOM libs and no ambient type packages. Runtime tests import the ESM distribution directly and check CommonJS parity. Bare-package .mts/.cts consumer tests include negative type assertions. Published files are only dist, this README, LICENSE and package.json. No publication is performed by tests.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
