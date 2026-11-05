// Server-side twin of frontend/src/utils/image.ts. The two must build identical URLs: the server
// preloads the page's main image in the HTML head, and the browser only reuses that download if
// the <img> rendered later asks for exactly the same srcset.

const PEXELS = 'images.pexels.com';
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

function resize(src: string, width: number): string | null {
  if (src.includes(PEXELS)) {
    try {
      const url = new URL(src);
      const w = Number(url.searchParams.get('w'));
      const h = Number(url.searchParams.get('h'));
      url.searchParams.set('w', String(width));
      if (w > 0 && h > 0) url.searchParams.set('h', String(Math.round((width * h) / w)));
      return url.toString();
    } catch {
      return null;
    }
  }
  const cloudinary = CLOUDINARY.exec(src);
  if (cloudinary) return `${cloudinary[1]}f_auto,q_auto,c_limit,w_${width}/${cloudinary[2]}`;
  return null;
}

export const IMAGE_PRESETS = {
  gallery: { widths: [400, 640, 960, 1280], sizes: '(min-width: 1024px) 45vw, 100vw' },
  banner: { widths: [480, 768, 1200, 1600], sizes: '(min-width: 1280px) 1216px, 100vw' },
} as const;

export function responsiveImage(src: string, preset: keyof typeof IMAGE_PRESETS): { src: string; srcSet?: string; sizes?: string } {
  const { widths, sizes } = IMAGE_PRESETS[preset];
  const variants = widths.map((w) => ({ w, url: resize(src, w) }));
  if (variants.some((v) => !v.url)) return { src };
  return { src: variants[1]!.url!, srcSet: variants.map((v) => `${v.url} ${v.w}w`).join(', '), sizes };
}
