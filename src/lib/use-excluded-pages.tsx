"use client";

import { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from "react";

const STORAGE_KEY = "marktech-excluded-pages";

interface ExcludedPagesContextValue {
  excludedPages: Set<string>;
  excludedCount: number;
  toggleExclude: (pageId: string) => void;
  clearExcluded: () => void;
  isExcluded: (pageId: string) => boolean;
  loaded: boolean;
}

const ExcludedPagesContext = createContext<ExcludedPagesContextValue | null>(null);

/**
 * Provider component — place this in DashboardLayout so both Sidebar
 * and the page component share the same exclude-state.
 */
export function ExcludedPagesProvider({ children }: { children: ReactNode }) {
  const [excludedPages, setExcludedPages] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setExcludedPages(new Set(parsed));
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage whenever excludedPages changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...excludedPages]));
    } catch {
      // ignore storage errors
    }
  }, [excludedPages, loaded]);

  const toggleExclude = useCallback((pageId: string) => {
    setExcludedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  const clearExcluded = useCallback(() => {
    setExcludedPages(new Set());
  }, []);

  const isExcluded = useCallback((pageId: string) => {
    return excludedPages.has(pageId);
  }, [excludedPages]);

  return (
    <ExcludedPagesContext.Provider value={{
      excludedPages,
      excludedCount: excludedPages.size,
      toggleExclude,
      clearExcluded,
      isExcluded,
      loaded,
    }}>
      {children}
    </ExcludedPagesContext.Provider>
  );
}

/**
 * Hook to access excluded pages — must be used inside ExcludedPagesProvider.
 */
export function useExcludedPages(): ExcludedPagesContextValue {
  const ctx = useContext(ExcludedPagesContext);
  if (!ctx) {
    throw new Error("useExcludedPages must be used within an ExcludedPagesProvider");
  }
  return ctx;
}
