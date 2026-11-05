import { orderService } from '@/services/orderService';
import { useQuery } from '@tanstack/react-query';

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => orderService.get(orderId),
    // Keep an in-flight refund or unpaid order fresh without a manual reload.
    refetchInterval: (q) => (q.state.data && (q.state.data.canPay || q.state.data.refunds.some((r) => r.status === 'PROCESSING')) ? 5000 : false),
  });
}
