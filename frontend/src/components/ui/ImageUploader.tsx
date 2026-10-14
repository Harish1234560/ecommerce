import { errorMessage } from '@/api/client';
import { Spinner } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { uploadService } from '@/services/accountService';
import { toast } from '@/store/toast';
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

// Multi-image uploader with primary selection (first image), reordering and delete.
export function ImageUploader({ value, onChange, max = 8, single }: { value: string[]; onChange: (urls: string[]) => void; max?: number; single?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const limit = single ? 1 : max;

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, limit - (single ? 0 : value.length));
    if (list.some((f) => f.size > 5 * 1024 * 1024)) return toast.error('Each image must be 5 MB or smaller');
    setBusy(true);
    try {
      const urls = await uploadService.images(list);
      onChange(single ? urls.slice(0, 1) : [...value, ...urls]);
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url + i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
            <Img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
            {!single && i === 0 && <span className="absolute left-1 top-1 rounded bg-stone-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">Primary</span>}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-stone-900/70 px-1 py-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              {!single && (
                <span className="flex">
                  <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move left" className="p-1 text-white disabled:opacity-30">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} aria-label="Move right" className="p-1 text-white disabled:opacity-30">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} aria-label="Remove image" className="ml-auto p-1 text-white hover:text-rose-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {value.length < limit && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs font-medium text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-700 disabled:opacity-60"
          >
            {busy ? <Spinner /> : <ImagePlus className="h-5 w-5" />}
            {busy ? 'Uploading' : 'Upload'}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={!single} hidden onChange={(e) => void pick(e.target.files)} />
      <p className="mt-2 text-xs text-stone-500">JPEG, PNG, WebP or GIF, up to 5 MB{single ? '' : `. First image is the primary image. Up to ${max} images.`}</p>
    </div>
  );
}
