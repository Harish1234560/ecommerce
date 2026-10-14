import { addressService } from '@/services/accountService';
import { useQuery } from '@tanstack/react-query';

export function useAddresses() {
  return useQuery({ queryKey: ['addresses'], queryFn: () => addressService.list() });
}
