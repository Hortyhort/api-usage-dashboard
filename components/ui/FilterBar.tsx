import type { ReactNode } from 'react';
import { Icons } from '../icons';
import { inputClasses, buttonClasses } from '../../lib/styles';

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchId?: string;
  children?: ReactNode;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

const FilterBar = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchId = 'filter-search',
  children,
  hasActiveFilters = false,
  onClearFilters,
}: FilterBarProps) => (
  <div className="bg-white dark:bg-claude-dark-surface border border-claude-border dark:border-claude-dark-border rounded-2xl p-4">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px] relative">
        <label htmlFor={searchId} className="sr-only">
          Search
        </label>
        <input
          id={searchId}
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-10 pr-4 ${inputClasses.base}`}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-claude-text-muted dark:text-claude-dark-text-muted">
          <Icons.Search />
        </div>
      </div>
      {children}
      {hasActiveFilters && onClearFilters && (
        <button type="button" onClick={onClearFilters} className={buttonClasses.ghost}>
          Clear filters
        </button>
      )}
    </div>
  </div>
);

export default FilterBar;
