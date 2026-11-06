import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { tokenizeText } from '../dist/esm/index.js';
test('finite default categories and half-open UTF16 offsets', () => {
  const tokens = tokenizeText('A😀 42!');
  assert.deepEqual(
    tokens.map((t) => [t.kind, t.start, t.end]),
    [
      ['letter', 0, 1],
      ['other', 1, 3],
      ['number', 4, 6],
      ['punctuation', 6, 7],
    ],
  );
  for (const token of tokens) assert.equal('A😀 42!'.slice(token.start, token.end), token.raw);
});
test('quotes and explicit minimal escapes', () => {
  const [quoted] = tokenizeText('"hi \\"you\\""');
  assert.equal(quoted.value, 'hi "you"');
  assert.equal(quoted.kind, 'quoted');
  assert.throws(() => tokenizeText('"bad\\n"'), SyntaxError);
  assert.throws(() => tokenizeText('"missing'), SyntaxError);
  assert.throws(() => tokenizeText('"bad\\'), SyntaxError);
});
test('category overrides and whitespace inclusion', () => {
  assert.deepEqual(
    tokenizeText('$€ \t', {
      categories: [{ name: 'currency', characters: '$€' }],
      includeWhitespace: true,
    }).map((t) => [t.kind, t.value]),
    [
      ['currency', '$€'],
      ['whitespace', ' \t'],
    ],
  );
  assert.equal(tokenizeText('"x"', { quotes: [] })[0].kind, 'punctuation');
  assert.equal(tokenizeText('«x«', { quotes: ['«'] })[0].value, 'x');
});
test('reject sparse malformed overlapping and reserved categories', () => {
  for (const categories of [
    [,],
    [{ name: 'letter', characters: 'a' }],
    [{ name: 'x', characters: '' }],
    [
      { name: 'x', characters: 'ab' },
      { name: 'y', characters: 'b' },
    ],
  ])
    assert.throws(() => tokenizeText('a', { categories }), TypeError);
  assert.throws(() => tokenizeText('a', { quotes: [,] }), TypeError);
  assert.throws(() => tokenizeText('a', { quotes: [' ', '"'] }), TypeError);
});
test('bounds and controls', () => {
  assert.throws(() => tokenizeText('\0'), TypeError);
  assert.throws(() => tokenizeText('aa', { maxInput: 1 }), TypeError);
  assert.equal(tokenizeText('a!', { maxTokens: 2 }).length, 2);
  assert.throws(() => tokenizeText('a!', { maxTokens: 1 }), RangeError);
  assert.throws(() => tokenizeText('', { maxTokens: 0 }), RangeError);
});
test('owned results and source slices with combining marks', () => {
  const source = 'e\u0301 𝟙';
  const tokens = tokenizeText(source);
  tokens[0].value = 'changed';
  assert.equal(tokenizeText(source)[0].value, 'e\u0301');
  assert.equal(tokenizeText(source)[1].value, '𝟙');
});
test('CJS surface', () => {
  assert.equal(
    createRequire(import.meta.url)('../dist/cjs/index.js').tokenizeText('abc')[0].value,
    'abc',
  );
});
