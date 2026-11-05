import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { fieldErrors, Input, Textarea } from '@/components/ui/Form';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { Img } from '@/components/ui/Img';
import { Modal } from '@/components/ui/Modal';
import { StarInput } from '@/components/ui/Rating';
import { reviewService } from '@/services/accountService';
import { toast } from '@/store/toast';
import type { MyReview } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

export interface ReviewTarget {
  productId: string;
  name: string;
  image: string | null;
  review?: MyReview;
}

export function ReviewModal({ target, onClose }: { target: ReviewTarget; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(target.review?.rating ?? 0);
  const [title, setTitle] = useState(target.review?.title ?? '');
  const [comment, setComment] = useState(target.review?.comment ?? '');
  const [images, setImages] = useState<string[]>(target.review?.images.map((i) => i.url) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () => {
      const body = { rating, title: title.trim() || undefined, comment: comment.trim(), images };
      return target.review ? reviewService.update(target.review.id, body) : reviewService.create(target.productId, body);
    },
    onSuccess: (res) => {
      const pending = (res as { status?: string } | undefined)?.status === 'PENDING';
      toast.success(pending ? 'Thanks! Your review will appear once it is approved.' : 'Thanks for your review!');
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['product'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (rating < 1) next.rating = 'Select a star rating';
    if (comment.trim().length < 10) next.comment = 'Please write at least 10 characters';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };

  return (
    <Modal open onClose={onClose} title={target.review ? 'Edit your review' : 'Write a review'} size="lg">
      <form onSubmit={submit} noValidate className="space-y-5">
        <div className="flex items-center gap-3">
          <Img src={target.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
          <p className="text-sm font-semibold text-stone-900">{target.name}</p>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-stone-700">Your rating <span className="text-rose-500">*</span></p>
          <StarInput value={rating} onChange={(v) => { setRating(v); setErrors((e) => ({ ...e, rating: '' })); }} />
          {errors.rating && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.rating}</p>}
        </div>
        <Input label="Title" placeholder="Sum it up in a few words" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <Textarea label="Comment" required rows={5} maxLength={2000} placeholder="What did you like or dislike? How was the quality?" value={comment} onChange={(e) => setComment(e.target.value)} error={errors.comment} />
        <div>
          <p className="mb-1.5 text-sm font-medium text-stone-700">Photos (optional)</p>
          <ImageUploader value={images} onChange={setImages} max={4} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{target.review ? 'Save changes' : 'Submit review'}</Button>
        </div>
      </form>
    </Modal>
  );
}
