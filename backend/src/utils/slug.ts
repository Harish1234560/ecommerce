export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Finds a free slug by appending -2, -3, … until `isTaken` says no.
export async function uniqueSlug(base: string, fallback: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || fallback;
  let slug = root;
  for (let n = 2; await isTaken(slug); n++) slug = `${root}-${n}`;
  return slug;
}
