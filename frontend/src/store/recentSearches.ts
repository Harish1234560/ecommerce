import { create } from 'zustand';

const KEY = 'recent-searches';
const MAX = 6;

function load(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function save(terms: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(terms));
  } catch {
    /* storage unavailable (private mode) — recent searches just will not persist */
  }
}

interface RecentSearches {
  terms: string[];
  add: (term: string) => void;
  clear: () => void;
}

// The customer's last few searches, kept in this browser only.
export const useRecentSearches = create<RecentSearches>((set, get) => ({
  terms: load(),
  add: (term) => {
    const t = term.trim();
    if (t.length < 2) return;
    const terms = [t, ...get().terms.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
    save(terms);
    set({ terms });
  },
  clear: () => {
    save([]);
    set({ terms: [] });
  },
}));
