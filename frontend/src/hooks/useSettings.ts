import { notificationService } from '@/services/accountService';
import { catalogService } from '@/services/catalogService';
import { useAuth } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => catalogService.publicSettings(), staleTime: 5 * 60_000 });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => catalogService.categories(), staleTime: 5 * 60_000 });
}

export function useUnreadCount() {
  const user = useAuth((s) => s.user);
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationService.unreadCount(),
    enabled: !!user && user.role === 'CUSTOMER',
    refetchInterval: 60_000,
    select: (d) => d.count,
  });
}
