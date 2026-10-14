import { lazy, type ComponentType } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a route component may take any props
type AnyComponent = ComponentType<any>;

// React.lazy for a named export, so every page is its own code-split chunk:
//   const CartPage = lazyNamed(() => import('@/pages/store/CartPage'), 'CartPage');
export function lazyNamed<K extends string, C extends AnyComponent>(load: () => Promise<Record<K, C>>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }));
}
