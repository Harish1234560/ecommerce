import { useAddresses } from '@/hooks/useAddresses';
import { useCart } from '@/hooks/useCart';
import { useCheckout } from '@/store/checkout';

// Shared guard + data for steps 2 and 3.
export function useCheckoutData() {
  const { addressId } = useCheckout();
  const addresses = useAddresses();
  const address = addresses.data?.find((a) => a.id === addressId) ?? null;
  const cartApi = useCart(address?.pincode);
  return { address, addresses, ...cartApi };
}
