import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateCost, calculateSavings, formatCurrency, formatNumber } from '../lib/formatters';
import { mockUsageData } from '../data/mockData';

describe('formatNumber', () => {
  it('formats thousands and millions', () => {
    assert.equal(formatNumber(950), '950');
    assert.equal(formatNumber(14500), '14.5k');
    assert.equal(formatNumber(2500000), '2.50M');
  });
});

describe('formatCurrency', () => {
  it('formats to two decimals', () => {
    assert.equal(formatCurrency(12), '$12.00');
    assert.equal(formatCurrency(12.345), '$12.35');
  });
});

describe('usage calculations', () => {
  it('calculates cost and savings from mock data', () => {
    const cost = calculateCost(mockUsageData);
    const savings = calculateSavings(mockUsageData);
    assert.ok(cost > 0);
    assert.ok(savings > 0);
  });
});
