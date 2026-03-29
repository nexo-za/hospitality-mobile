import { useMemo, useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import type { MenuItem } from '@/types/hospitality';

export interface MatchHighlight {
  field: string;
  indices: ReadonlyArray<[number, number]>;
}

export interface SearchResult {
  item: MenuItem;
  highlights: MatchHighlight[];
  score: number;
}

const FUSE_OPTIONS: Fuse.IFuseOptions<MenuItem> = {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'tags', weight: 0.2 },
    { name: 'categoryName', weight: 0.2 },
    { name: 'description', weight: 0.1 },
  ],
  threshold: 0.35,
  distance: 120,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

const DEBOUNCE_MS = 250;

export function useMenuSearch(
  items: MenuItem[],
  category: string,
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const categoryFiltered = useMemo(() => {
    if (category === 'all' || category === 'All') return items;
    return items.filter((i) => {
      const cat = i.categoryName || (i as any).category?.name || (i as any).category;
      return typeof cat === 'string' && cat.toLowerCase() === category.toLowerCase();
    });
  }, [items, category]);

  const fuse = useMemo(
    () => new Fuse(categoryFiltered, FUSE_OPTIONS),
    [categoryFiltered],
  );

  const results: SearchResult[] = useMemo(() => {
    if (debouncedQuery.length < 2) {
      return categoryFiltered
        .slice()
        .sort((a, b) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1))
        .map((item) => ({ item, highlights: [], score: 0 }));
    }

    return fuse.search(debouncedQuery).map((r) => ({
      item: r.item,
      score: r.score ?? 1,
      highlights:
        r.matches?.map((m) => ({
          field: m.key ?? '',
          indices: m.indices as ReadonlyArray<[number, number]>,
        })) ?? [],
    }));
  }, [categoryFiltered, debouncedQuery, fuse]);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    filteredItems: results.map((r) => r.item),
    highlightMap: useMemo(() => {
      const map = new Map<number, MatchHighlight[]>();
      for (const r of results) {
        if (r.highlights.length > 0) map.set(r.item.id, r.highlights);
      }
      return map;
    }, [results]),
  };
}

/**
 * Split text into segments for highlighted rendering.
 * Each segment is { text, highlighted }.
 */
export function getHighlightSegments(
  text: string,
  indices: ReadonlyArray<[number, number]>,
): { text: string; highlighted: boolean }[] {
  if (!indices.length || !text) return [{ text, highlighted: false }];

  const segments: { text: string; highlighted: boolean }[] = [];
  let lastEnd = 0;

  for (const [start, end] of indices) {
    if (start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, start), highlighted: false });
    }
    segments.push({ text: text.slice(start, end + 1), highlighted: true });
    lastEnd = end + 1;
  }

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), highlighted: false });
  }

  return segments;
}
