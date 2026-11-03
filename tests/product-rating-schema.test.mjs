import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/productRatingSchema.ts', import.meta.url), 'utf8');
const context = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { buildAggregateRating } = context.exports;

test('reported five-star average is published as five, not vote-derived 3.1', () => {
  const schema = buildAggregateRating({ average_rating: 5, rating_count: 1 });
  assert.equal(schema.ratingValue, 5);
  assert.equal(schema.ratingCount, 1);
  assert.equal(schema.bestRating, 5);
  assert.equal(schema.worstRating, 1);
});

test('no ratings means no aggregate rating even when upvotes exist', () => {
  assert.equal(buildAggregateRating(null), undefined);
  assert.equal(buildAggregateRating({ average_rating: 0, rating_count: 0, netVotes: 2 }), undefined);
});

test('real rating averages and counts are preserved independently of upvotes', () => {
  const schema = buildAggregateRating({ average_rating: 4.25, rating_count: 8, netVotes: 100 });
  assert.equal(schema.ratingValue, 4.3);
  assert.equal(schema.ratingCount, 8);
});

test('invalid rating statistics are not published', () => {
  for (const stats of [
    { average_rating: NaN, rating_count: 1 },
    { average_rating: 6, rating_count: 1 },
    { average_rating: 0, rating_count: 1 },
    { average_rating: 5, rating_count: -1 },
    { average_rating: 5, rating_count: 1.5 },
  ]) assert.equal(buildAggregateRating(stats), undefined);
});