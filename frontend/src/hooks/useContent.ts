import { catalogService } from '@/services/catalogService';
import { useQuery } from '@tanstack/react-query';

export function useContent<D = Record<string, unknown>>(slug: string) {
  return useQuery({ queryKey: ['content', slug], queryFn: () => catalogService.contentPage<D>(slug), staleTime: 5 * 60_000 });
}
