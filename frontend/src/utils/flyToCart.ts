// "Added to cart" feedback: a small copy of the product image glides to the cart icon.
// Uses only transform and opacity (no layout work), and is skipped when the customer has asked
// for reduced motion or the cart icon is not on screen.
export function flyToCart(source: Element | null | undefined) {
  if (!source || typeof source.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].find((el) => el.offsetParent !== null);
  const img = source instanceof HTMLImageElement ? source : source.querySelector('img');
  if (!target || !img) return;

  const from = img.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0) return;

  const size = 56;
  const ghost = img.cloneNode(false) as HTMLImageElement;
  ghost.removeAttribute('srcset');
  ghost.removeAttribute('sizes');
  ghost.removeAttribute('loading');
  ghost.src = img.currentSrc || img.src;
  ghost.alt = '';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.className = '';
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    borderRadius: '12px',
    pointerEvents: 'none',
    zIndex: '95',
    opacity: '1',
    boxShadow: '0 8px 24px rgb(28 25 23 / 0.2)',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (startX + size / 2);
  const dy = to.top + to.height / 2 - (startY + size / 2);
  const animation = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1.4)', opacity: 0.95 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.85}px) scale(0.9)`, opacity: 0.9, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0 },
    ],
    { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
  const cleanup = () => ghost.remove();
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
}
