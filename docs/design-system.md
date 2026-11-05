# Design System

The storefront is designed for phones first and then widened for tablets and desktops.
Priority order when two goals conflict: mobile usability, speed, clarity, trust, conversion,
visual polish, desktop.

## Tokens

Every colour, radius, shadow, duration and layer lives in one file:
`frontend/src/styles/tokens.css`. `frontend/tailwind.config.js` maps Tailwind's class names to
those variables, so components never contain hex values. To rebrand the shop, edit `tokens.css`.

| Group | Tokens | Used as |
|---|---|---|
| Brand | `--brand-50` … `--brand-950` (peacock green) | `bg-brand-600`, `text-brand-700` |
| Accent | `--accent-50` … `--accent-900` (saffron) | deals, discount badges, cart badge |
| Neutral | `--stone-50` … `--stone-950` | text, borders, surfaces |
| Status | `--error-*`, `--warning-*`, `--success-*`, `--info-*` | `rose-*`, `amber-*`, `emerald-*`, `sky-*` or the semantic names |
| Semantic | `--color-bg`, `--color-surface`, `--color-fg`, `--color-fg-secondary`, `--color-fg-muted`, `--color-line`, `--color-primary`, `--color-primary-hover`, `--color-primary-soft` | `bg-canvas`, `bg-surface`, `text-fg`, `border-line`, `bg-primary` |
| Radius | `--radius-sm` 8, `--radius-md` 12, `--radius-lg` 16, `--radius-xl` 24 | `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` |
| Shadow | `--shadow-card`, `--shadow-lift`, `--shadow-bar` | `shadow-card`, `shadow-lift`, `shadow-bar` |
| Motion | `--duration-fast` 150ms, `--duration-base` 200ms, `--duration-slow` 300ms, `--ease-out` | `duration-fast`, `duration-base`, `ease-out` |
| Layers | `--z-sticky`, `--z-header`, `--z-nav`, `--z-overlay`, `--z-toast` | `z-sticky`, `z-header`, `z-nav`, `z-overlay`, `z-toast` |
| Layout | `--bottom-nav-height`, `--safe-bottom` | `pb-bottom-nav`, `pb-safe-b` |

The admin dashboard keeps its own slate and indigo palette (the `.admin` class) so it is visually
distinct from the storefront.

## Typography

Inter for text and Plus Jakarta Sans for headings, both self-hosted variable fonts
(`@fontsource-variable/*`) with `font-display: swap`. No request goes to a font CDN.

| Token | Size | Use |
|---|---|---|
| `text-display` / `text-display-lg` | 32 / 56px, weight 800 | hero headline |
| `text-h1` | 26px, weight 700 | page title |
| `text-h2` | 20px, weight 700 | section title |
| `text-h3` | 16px, weight 600 | card and group titles |
| `text-body-lg`, `text-body`, `text-body-sm` | 16 / 14 / 13px | running text |
| `text-caption` | 12px | labels, meta |

Prices are bold and at least one step larger than the text around them.
Form fields are 16px on phones so iOS does not zoom the page on focus.

## Spacing and breakpoints

Spacing uses Tailwind's 4px scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64).
Breakpoints: base styles are phones; `sm` 640, `md` 768 (tablet), `lg` 1024 (desktop), `xl` 1280.

## Touch

- Interactive targets are at least 44×44px on phones; primary actions are 44–48px tall.
- Small visuals (the wishlist heart on a card) sit inside a 44px hit area.
- A product card is one large tap target: its title link is stretched over the whole tile.
- Hover styles apply only on devices that can hover.
- Buttons give press feedback with a small scale on `:active` (`.pressable`).

## Components

All in `frontend/src/components` and `frontend/src/layouts`.

| Component | Notes |
|---|---|
| `ui/Button`, `IconButton` | variants `primary`, `brand`, `outline`, `ghost`, `danger`, `soft`; sizes `sm`, `md`, `lg`; loading state |
| `ui/Form` | `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle` with labels, hints and inline errors |
| `ui/Modal` | centred dialog on larger screens; a bottom sheet on phones with a grab handle and drag-to-dismiss |
| `ui/Img` | responsive `srcset`, lazy loading, fade-in, fallback icon |
| `ui/Feedback` | `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, spinners |
| `ui/Toaster` | toast notifications |
| `ui/Price`, `ui/Rating`, `ui/QuantityStepper`, `ui/Pagination` | |
| `product/ProductCard`, `ProductGrid`, `ProductRail`, `ProductRow` | two-column grid on phones; `ProductRail` is a swipeable row on phones and a grid from tablet up |
| `layouts/store/Header` | compact sticky header with the search box always visible on phones |
| `layouts/store/BottomNav` | fixed phone navigation: Home, Categories, Search, Wishlist, Account |
| `layouts/store/SearchBox` | 300ms debounce, recent and popular searches, live suggestions, clear button |
| `cart/MobileActionBar` | pinned total and primary action on cart and checkout |
| `common/ErrorBoundary`, `common/OfflineBanner` | crash recovery screen; offline notice |

## Sticky bars

There is never more than one bar pinned to the bottom of the screen:

| Page | Bottom bar |
|---|---|
| Most pages | bottom navigation |
| Product | price, Add to Cart, Buy Now |
| Cart | total, Proceed to Checkout |
| Checkout | total and the step's action (for example Pay ₹1,299) |

All of them respect the iPhone safe area (`env(safe-area-inset-bottom)`).

## Motion

- Micro-interactions run 150–250ms and animate only `transform` and `opacity`.
- Wishlist heart pops when saved; the cart badge pops when the count changes; a small copy of the
  product image glides to the cart icon on Add to cart; quantity changes fade in.
- Wishlist and cart-quantity changes are optimistic: the UI updates at once and reverts with an
  error message if the server refuses.
- The hero carousel is swipeable and starts rotating only after the visitor first interacts.
- `prefers-reduced-motion` turns all of this off (CSS rule plus Framer Motion's `reducedMotion="user"`).

## Images

`utils/image.ts` asks image hosts that can resize (Cloudinary, and the Pexels demo images) for the
width actually needed, through `srcset` and `sizes`. Every image sits in a fixed-ratio box, so
nothing moves when it loads. Above-the-fold images load eagerly with high priority and the server
preloads the page's main image; everything else is lazy.

Images uploaded to local storage are served as uploaded, without resizing. Use Cloudinary storage
in production if admins will upload large photos.
