import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDistribution, effectiveMmPerPixel } from '../src/analysis.js';

test('buildDistribution calcula D10, D50, D80 em ordem', () => {
  const result = buildDistribution(Array.from({ length: 100 }, (_, index) => index + 10));
  assert.ok(result.d10 < result.d50);
  assert.ok(result.d50 < result.d80);
  assert.equal(result.real.length, 16);
  assert.ok(result.real.at(-1).passing > 95);
});

test('buildDistribution preserva séries auxiliares com o mesmo eixo', () => {
  const result = buildDistribution([10, 20, 50, 100, 200, 400, 800]);
  assert.equal(result.real.length, result.kuzRam.length);
  assert.equal(result.real.length, result.swebrec.length);
  assert.ok(result.kuzRam.every((row) => row.passing >= 0 && row.passing <= 100));
});

test('effectiveMmPerPixel converte a escala nativa para o pixel analisado', () => {
  // Demo: 2441 px nativos reduzidos para 1500 px -> cada pixel analisado cobre ~1,63 px nativos
  assert.ok(Math.abs(effectiveMmPerPixel(500, 2441, 1500) - 500 * 2441 / 1500) < 1e-9);
  assert.equal(effectiveMmPerPixel(500, 1500, 1500), 500);
  assert.equal(effectiveMmPerPixel(500, 0, 0), 500);
});
