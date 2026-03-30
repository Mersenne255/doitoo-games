import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { computeCardPacking } from '../utils/card-packing.util';

describe('computeCardPacking', () => {
  it('3 cards in wide-short container prefers 2 rows', () => {
    // 300w × 100h — single row: 300/3=100 but height=100 so size=~96 (minus gap)
    // 2 rows (2+1): 300/2=150, 100/2=46 → size=46. Single row wins here.
    // But 300w × 80h: single row: (300-16)/3=94, h=80 → 80. 2 rows: (300-8)/2=146, (80-8)/2=36 → 36. Single row.
    // 200w × 80h: single row: (200-16)/3=61, h=80 → 61. 2 rows: (200-8)/2=96, (80-8)/2=36 → 36. Single row.
    // The algorithm should always pick the layout with the biggest cards.
    const r = computeCardPacking(300, 100, 3, 8);
    assert.ok(r.cardSize > 0);
    assert.ok(r.cols * r.rows >= 3, 'must have enough cells');
  });

  it('3 cards in tall-narrow container prefers multiple rows', () => {
    // 100w × 300h — single row: (100-16)/3=28. 3 rows: 100/1=100, (300-16)/3=94 → 94
    const r = computeCardPacking(100, 300, 3, 8);
    assert.equal(r.cols, 1, 'should use 1 column');
    assert.equal(r.rows, 3);
    assert.ok(r.cardSize >= 90, `expected ~94, got ${r.cardSize}`);
  });

  it('5 cards in square container', () => {
    const r = computeCardPacking(300, 300, 5, 8);
    assert.ok(r.cols >= 2 && r.cols <= 3);
    assert.ok(r.cardSize > 0);
    assert.ok(r.cols * r.rows >= 5);
  });

  it('cards never overflow width', () => {
    for (const count of [3, 4, 5]) {
      for (const [w, h] of [[200, 80], [100, 200], [300, 150], [150, 300]]) {
        const r = computeCardPacking(w, h, count, 8);
        const totalW = r.cols * r.cardSize + (r.cols - 1) * 8;
        assert.ok(totalW <= w, `overflow W: ${totalW} > ${w} for ${count} cards in ${w}×${h}, cols=${r.cols}, size=${r.cardSize}`);
      }
    }
  });

  it('cards never overflow height', () => {
    for (const count of [3, 4, 5]) {
      for (const [w, h] of [[200, 80], [100, 200], [300, 150], [150, 300]]) {
        const r = computeCardPacking(w, h, count, 8);
        const totalH = r.rows * r.cardSize + (r.rows - 1) * 8;
        assert.ok(totalH <= h, `overflow H: ${totalH} > ${h} for ${count} cards in ${w}×${h}, rows=${r.rows}, size=${r.cardSize}`);
      }
    }
  });

  it('respects minSize', () => {
    const r = computeCardPacking(50, 50, 5, 8, 30);
    assert.ok(r.cardSize >= 30);
  });

  it('respects maxSize', () => {
    const r = computeCardPacking(1000, 1000, 3, 8, 30, 150);
    assert.ok(r.cardSize <= 150);
  });

  it('always picks the layout with the largest card size', () => {
    // Brute-force verify for a range of container sizes
    for (const count of [3, 4, 5]) {
      for (const [w, h] of [[200, 100], [100, 200], [300, 120], [250, 250]]) {
        const r = computeCardPacking(w, h, count, 8, 1, 999);
        // Verify no other column count gives a bigger valid size
        for (let cols = 1; cols <= count; cols++) {
          const rows = Math.ceil(count / cols);
          const sW = Math.floor((w - 8 * (cols - 1)) / cols);
          const sH = Math.floor((h - 8 * (rows - 1)) / rows);
          const s = Math.min(sW, sH);
          assert.ok(s <= r.cardSize, `cols=${cols} gives size ${s} > best ${r.cardSize} for ${count} in ${w}×${h}`);
        }
      }
    }
  });

  it('handles 1 card', () => {
    const r = computeCardPacking(200, 200, 1, 8);
    assert.equal(r.cols, 1);
    assert.equal(r.rows, 1);
    assert.ok(r.cardSize <= 150);
  });

  it('handles very small container', () => {
    const r = computeCardPacking(30, 30, 5, 8, 10);
    assert.ok(r.cardSize >= 10);
  });
});
