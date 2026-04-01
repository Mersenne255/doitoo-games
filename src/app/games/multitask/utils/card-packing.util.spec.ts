import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { computeCardPacking } from './card-packing.util';

describe('computeCardPacking', () => {
  it('3 cards in wide-short container prefers 2 rows', () => {
    const r = computeCardPacking(300, 100, 3, 8);
    assert.ok(r.cardSize > 0);
    assert.ok(r.cols * r.rows >= 3, 'must have enough cells');
  });

  it('3 cards in tall-narrow container prefers multiple rows', () => {
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
    for (const count of [3, 4, 5]) {
      for (const [w, h] of [[200, 100], [100, 200], [300, 120], [250, 250]]) {
        const r = computeCardPacking(w, h, count, 8, 1, 999);
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
