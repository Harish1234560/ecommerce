import { useSearchParams } from 'react-router-dom';

export function useListParams() {
  const [params, setParams] = useSearchParams();
  const get = (k: string, d = '') => params.get(k) ?? d;
  const set = (changes: Record<string, string>) => {
    // Read the live URL (not the last render) so two quick filter changes cannot overwrite each other.
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };
  return { get, set, page: Number(get('page', '1')) };
}
