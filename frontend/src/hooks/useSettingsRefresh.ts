import { useQueryClient } from '@tanstack/react-query';

export function useSettingsRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    void qc.invalidateQueries({ queryKey: ['settings'] });
    void qc.invalidateQueries({ queryKey: ['cart'] });
  };
}
