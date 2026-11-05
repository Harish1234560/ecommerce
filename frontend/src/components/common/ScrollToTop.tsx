import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Braces matter: scrollTo returns a Promise in current browsers, and an effect must not return one.
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
