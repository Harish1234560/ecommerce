import { useQueryClient } from '@tanstack/react-query';

export function useContentRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'content'] });
    void qc.invalidateQueries({ queryKey: ['home'] });
    void qc.invalidateQueries({ queryKey: ['content'] });
  };
}
