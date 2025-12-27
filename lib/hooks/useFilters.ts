import { useMemo, useState, useCallback } from 'react';

type FilterConfig<T> = {
  key: keyof T | ((item: T) => string);
  matchMode?: 'includes' | 'exact' | 'startsWith';
};

type UseFiltersOptions<T> = {
  searchFields?: FilterConfig<T>[];
  initialSearch?: string;
};

type FilterState<T> = {
  [K in keyof T]?: T[K] | T[K][] | 'all';
};

export function useFilters<T extends Record<string, unknown>>(
  items: T[],
  options: UseFiltersOptions<T> = {}
) {
  const { searchFields = [], initialSearch = '' } = options;

  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<FilterState<T>>({});

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K] | T[K][] | 'all') => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilters({});
  }, []);

  const hasActiveFilters = useMemo(() => {
    const hasSearch = search.trim().length > 0;
    const hasFilters = Object.entries(filters).some(([, value]) => value !== 'all' && value !== undefined);
    return hasSearch || hasFilters;
  }, [search, filters]);

  const filteredItems = useMemo(() => {
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
  }, [items, search, filters, searchFields]);

  return {
    search,
    setSearch,
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    filteredItems,
    totalCount: items.length,
    filteredCount: filteredItems.length,
  };
}
