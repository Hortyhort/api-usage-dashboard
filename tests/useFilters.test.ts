/**
 * Tests for the useFilters hook
 *
 * Note: Since this is a React hook, we test the core filtering logic
 * by extracting the filter functions. For full integration tests,
 * you'd use @testing-library/react-hooks.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Extract the core filtering logic for testing
type FilterConfig<T> = {
  key: keyof T | ((item: T) => string);
  matchMode?: 'includes' | 'exact' | 'startsWith';
};

type FilterState<T> = {
  [K in keyof T]?: T[K] | T[K][] | 'all';
};

function applyFilters<T extends Record<string, unknown>>(
  items: T[],
  search: string,
  filters: FilterState<T>,
  searchFields: FilterConfig<T>[] = []
): T[] {
  return items.filter((item) => {
    // Apply search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchesSearch = searchFields.length === 0
        ? Object.values(item).some((value) =>
            String(value).toLowerCase().includes(query)
          )
        : searchFields.some((field) => {
            const value = typeof field.key === 'function'
              ? field.key(item)
              : String(item[field.key] ?? '');
            const normalizedValue = value.toLowerCase();
            const matchMode = field.matchMode ?? 'includes';

            switch (matchMode) {
              case 'exact':
                return normalizedValue === query;
              case 'startsWith':
                return normalizedValue.startsWith(query);
              case 'includes':
              default:
                return normalizedValue.includes(query);
            }
          });

      if (!matchesSearch) return false;
    }

    // Apply property filters
    for (const [key, filterValue] of Object.entries(filters)) {
      if (filterValue === 'all' || filterValue === undefined) continue;

      const itemValue = item[key as keyof T];

      if (Array.isArray(filterValue)) {
        if (!filterValue.includes(itemValue as T[keyof T])) return false;
      } else {
        if (itemValue !== filterValue) return false;
      }
    }

    return true;
  });
}

// Test data
type TestItem = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  category: string;
};

const testItems: TestItem[] = [
  { id: 1, name: 'Alpha Key', status: 'active', category: 'production' },
  { id: 2, name: 'Beta Key', status: 'inactive', category: 'development' },
  { id: 3, name: 'Gamma Key', status: 'active', category: 'production' },
  { id: 4, name: 'Delta Token', status: 'inactive', category: 'staging' },
  { id: 5, name: 'Epsilon Key', status: 'active', category: 'development' },
];

describe('useFilters - search functionality', () => {
  it('returns all items when search is empty', () => {
    const result = applyFilters(testItems, '', {});
    assert.equal(result.length, 5);
  });

  it('filters by search term across all fields (default)', () => {
    const result = applyFilters(testItems, 'Key', {});
    assert.equal(result.length, 4); // Alpha, Beta, Gamma, Epsilon
  });

  it('is case insensitive', () => {
    const result = applyFilters(testItems, 'key', {});
    assert.equal(result.length, 4);
  });

  it('filters by specific search fields', () => {
    const searchFields: FilterConfig<TestItem>[] = [{ key: 'name' }];
    const result = applyFilters(testItems, 'alpha', {}, searchFields);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Alpha Key');
  });

  it('supports exact match mode', () => {
    const searchFields: FilterConfig<TestItem>[] = [
      { key: 'category', matchMode: 'exact' },
    ];
    const result = applyFilters(testItems, 'production', {}, searchFields);
    assert.equal(result.length, 2);
  });

  it('supports startsWith match mode', () => {
    const searchFields: FilterConfig<TestItem>[] = [
      { key: 'name', matchMode: 'startsWith' },
    ];
    const result = applyFilters(testItems, 'alpha', {}, searchFields);
    assert.equal(result.length, 1);

    const noMatch = applyFilters(testItems, 'key', {}, searchFields);
    assert.equal(noMatch.length, 0);
  });

  it('supports function-based search fields', () => {
    const searchFields: FilterConfig<TestItem>[] = [
      { key: (item) => `${item.name} - ${item.category}` },
    ];
    const result = applyFilters(testItems, 'production', {}, searchFields);
    assert.equal(result.length, 2);
  });

  it('ignores whitespace-only search', () => {
    const result = applyFilters(testItems, '   ', {});
    assert.equal(result.length, 5);
  });
});

describe('useFilters - property filters', () => {
  it('filters by single property value', () => {
    const result = applyFilters(testItems, '', { status: 'active' });
    assert.equal(result.length, 3);
    assert.ok(result.every((item) => item.status === 'active'));
  });

  it('ignores "all" filter value', () => {
    const result = applyFilters(testItems, '', { status: 'all' });
    assert.equal(result.length, 5);
  });

  it('ignores undefined filter value', () => {
    const result = applyFilters(testItems, '', { status: undefined });
    assert.equal(result.length, 5);
  });

  it('filters by array of values', () => {
    const result = applyFilters(testItems, '', {
      category: ['production', 'staging'] as unknown as TestItem['category'],
    });
    assert.equal(result.length, 3);
  });

  it('combines multiple property filters (AND logic)', () => {
    const result = applyFilters(testItems, '', {
      status: 'active',
      category: 'production',
    });
    assert.equal(result.length, 2);
    assert.ok(
      result.every(
        (item) => item.status === 'active' && item.category === 'production'
      )
    );
  });
});

describe('useFilters - combined search and filters', () => {
  it('applies both search and property filters', () => {
    const result = applyFilters(testItems, 'key', { status: 'active' });
    assert.equal(result.length, 3); // Alpha, Gamma, Epsilon (active + contains "key")
  });

  it('returns empty when no items match combined criteria', () => {
    const result = applyFilters(testItems, 'token', { status: 'active' });
    assert.equal(result.length, 0);
  });
});
