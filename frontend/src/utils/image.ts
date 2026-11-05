// Responsive image URLs. Phones should never download a desktop-sized picture, so for image hosts
// that can resize on the fly we ask for the width actually needed and let the browser choose via
// srcset/sizes. Other URLs (e.g. files uploaded to local storage) are used as they are.

const PEXELS = 'images.pexels.com';
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

function resize(src: string, width: number): string | null {
  if (src.includes(PEXELS)) {
    try {
      const url = new URL(src);
      const w = Number(url.searchParams.get('w'));
      const h = Number(url.searchParams.get('h'));
      url.searchParams.set('w', String(width));
      // Keep the original aspect ratio.
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

export const IMAGE_WIDTHS = {
  thumb: [96, 192],
  card: [200, 320, 480, 640],
  gallery: [400, 640, 960, 1280],
  banner: [480, 768, 1200, 1600],
} as const;

export type ImagePreset = keyof typeof IMAGE_WIDTHS;

export function responsiveImage(src: string, preset: ImagePreset): { src: string; srcSet?: string } {
  const widths = IMAGE_WIDTHS[preset];
  const variants = widths.map((w) => ({ w, url: resize(src, w) }));
  if (variants.some((v) => !v.url)) return { src };
  return { src: variants[Math.min(1, variants.length - 1)]!.url!, srcSet: variants.map((v) => `${v.url} ${v.w}w`).join(', ') };
}
