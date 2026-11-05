import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

// Tells the customer when the connection drops. Their cart and anything typed into a form stay
// as they are; requests are simply retried once the connection is back.
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      You are offline. Your cart is safe — we will reconnect automatically.
    </div>
  );
}
