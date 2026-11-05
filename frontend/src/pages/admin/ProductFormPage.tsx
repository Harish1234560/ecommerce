import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button, buttonClass } from '@/components/ui/Button';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Checkbox, fieldErrors, Input, Select, Textarea, Toggle } from '@/components/ui/Form';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useSeo } from '@/hooks/useSeo';
import { adminProductService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type ProductStatus } from '@/types/admin';
import { toPaise, toRupees } from '@/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface VariantForm {
  id?: string;
  sku: string;
  size: string;
  color: string;
  price: string;
  discountPrice: string;
  stock: string;
  isActive: boolean;
  reserved?: number;
}

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  subcategoryId: string;
  description: string;
  brand: string;
  tags: string;
  price: string;
  discountPrice: string;
  tax: string;
  stock: string;
  lowStockThreshold: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  status: ProductStatus;
  featured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  images: string[];
  specifications: { label: string; value: string }[];
  variants: VariantForm[];
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '', slug: '', sku: '', categoryId: '', subcategoryId: '', description: '', brand: '', tags: '', price: '', discountPrice: '', tax: '', stock: '0', lowStockThreshold: '5',
  weight: '', length: '', width: '', height: '', status: 'ACTIVE', featured: false, isTrending: false, isBestSeller: false, images: [], specifications: [], variants: [],
};

const str = (v: number | null | undefined) => (v == null ? '' : String(v));

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export function ProductFormPage() {
  const { id } = useParams();
  const editing = !!id;
  useSeo({ title: editing ? 'Edit Product — Admin' : 'Add Product — Admin', noindex: true });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories } = useAdminCategories();
  const existing = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => adminProductService.get(id!), enabled: editing, gcTime: 0 });
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setForm({
      name: p.name, slug: p.slug, sku: p.sku, categoryId: p.categoryId, subcategoryId: p.subcategoryId ?? '', description: p.description, brand: p.brand ?? '', tags: p.tags.join(', '),
      price: toRupees(p.price), discountPrice: toRupees(p.discountPrice), tax: str(p.tax), stock: String(p.baseStock), lowStockThreshold: String(p.lowStockThreshold),
      weight: str(p.weight), length: str(p.length), width: str(p.width), height: str(p.height), status: p.status, featured: p.featured, isTrending: p.isTrending, isBestSeller: p.isBestSeller,
      images: p.images.map((i) => i.url), specifications: p.specifications ?? [],
      variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size ?? '', color: v.color ?? '', price: toRupees(v.price), discountPrice: toRupees(v.discountPrice), stock: String(v.stock), isActive: v.isActive, reserved: v.reserved })),
    });
  }, [existing.data]);

  const set = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };
  const setVariant = (i: number, patch: Partial<VariantForm>) => set('variants', form.variants.map((v, n) => (n === i ? { ...v, ...patch } : v)));
  const subcategories = categories?.find((c) => c.id === form.categoryId)?.subcategories ?? [];

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(), slug: form.slug.trim() || undefined, sku: form.sku.trim(), categoryId: form.categoryId, subcategoryId: form.subcategoryId || null,
        description: form.description.trim(), brand: form.brand.trim() || null, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        price: toPaise(form.price), discountPrice: form.discountPrice.trim() ? toPaise(form.discountPrice) : null, tax: numOrNull(form.tax),
        stock: Number(form.stock || 0), lowStockThreshold: Number(form.lowStockThreshold || 0),
        weight: numOrNull(form.weight), length: numOrNull(form.length), width: numOrNull(form.width), height: numOrNull(form.height),
        status: form.status, featured: form.featured, isTrending: form.isTrending, isBestSeller: form.isBestSeller,
        images: form.images.map((url) => ({ url })),
        specifications: form.specifications.filter((s) => s.label.trim() && s.value.trim()),
        variants: form.variants.map((v) => ({
          id: v.id, sku: v.sku.trim(), size: v.size.trim() || null, color: v.color.trim() || null,
          price: v.price.trim() ? toPaise(v.price) : null, discountPrice: v.discountPrice.trim() ? toPaise(v.discountPrice) : null, stock: Number(v.stock || 0), isActive: v.isActive,
        })),
      };
      return editing ? adminProductService.update(id!, body) : adminProductService.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Product updated' : 'Product created');
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['product'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
      navigate('/admin/products');
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Product name is required';
    if (!form.sku.trim()) next.sku = 'SKU is required';
    if (!form.categoryId) next.categoryId = 'Select a category';
    if (!form.description.trim()) next.description = 'Description is required';
    if (!(Number(form.price) > 0)) next.price = 'Enter a price greater than zero';
    if (form.discountPrice.trim() && !(Number(form.discountPrice) < Number(form.price))) next.discountPrice = 'Must be lower than the price';
    if (form.variants.some((v) => !v.sku.trim())) next.variants = 'Every variant needs a SKU';
    if (form.variants.some((v) => !v.size.trim() && !v.color.trim())) next.variants = 'Every variant needs a size or a color';
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    save.mutate();
  };

  if (editing && existing.isLoading) return <PageSpinner />;
  if (editing && existing.error) return <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />;
  const hasVariants = form.variants.length > 0;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={editing ? 'Edit product' : 'Add product'}
        subtitle={editing ? form.name : 'Create a new product for your store'}
        actions={
          <>
            <Link to="/admin/products" className={buttonClass('outline', 'sm')}><ArrowLeft className="h-4 w-4" /> Back</Link>
            <Button type="submit" size="sm" loading={save.isPending}>{editing ? 'Save changes' : 'Create product'}</Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Product Name" required wrapperClassName="sm:col-span-2" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
              <Input label="SKU" required value={form.sku} onChange={(e) => set('sku', e.target.value)} error={errors.sku} />
              <Input label="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} error={errors.brand} />
              <Textarea label="Description" required rows={6} wrapperClassName="sm:col-span-2" value={form.description} onChange={(e) => set('description', e.target.value)} error={errors.description} />
              <Input label="Tags" wrapperClassName="sm:col-span-2" hint="Comma-separated, used by search — e.g. cotton, summer, casual" value={form.tags} onChange={(e) => set('tags', e.target.value)} error={errors.tags} />
              {editing && <Input label="URL slug" wrapperClassName="sm:col-span-2" hint="The product page address: /product/your-slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} error={errors.slug} />}
            </div>
          </Card>

          <Card title="Images" subtitle="The first image is the primary image. Use the arrows to reorder.">
            <ImageUploader value={form.images} onChange={(urls) => set('images', urls)} max={8} />
            {errors.images && <p className="mt-2 text-xs text-rose-600">{errors.images}</p>}
          </Card>

          <Card title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Price (MRP)" required type="number" min="0" step="0.01" prefix="₹" value={form.price} onChange={(e) => set('price', e.target.value)} error={errors.price} />
              <Input label="Discount Price" type="number" min="0" step="0.01" prefix="₹" hint="Selling price, if discounted" value={form.discountPrice} onChange={(e) => set('discountPrice', e.target.value)} error={errors.discountPrice} />
              <Input label="Tax (GST %)" type="number" min="0" max="100" step="0.01" hint="Blank = use tax rules" value={form.tax} onChange={(e) => set('tax', e.target.value)} error={errors.tax} />
            </div>
          </Card>

          <Card
            title="Variants"
            subtitle="Sizes and colors. Each variant has its own SKU, stock and (optionally) price."
            actions={<Button size="sm" variant="outline" className="h-8" onClick={() => set('variants', [...form.variants, { sku: form.sku ? `${form.sku}-${form.variants.length + 1}` : '', size: '', color: '', price: '', discountPrice: '', stock: '0', isActive: true }])} icon={<Plus className="h-3.5 w-3.5" />}>Add variant</Button>}
          >
            {!hasVariants ? (
              <p className="text-sm text-slate-500">This product has no variants. Add variants if it comes in different sizes or colors.</p>
            ) : (
              <div className="space-y-3">
                {errors.variants && <p role="alert" className="text-sm text-rose-600">{errors.variants}</p>}
                {form.variants.map((v, i) => (
                  <div key={v.id ?? `new-${i}`} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-4 lg:grid-cols-[1.4fr_0.8fr_0.9fr_0.9fr_0.9fr_0.8fr_auto]">
                    <Input label="SKU" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} />
                    <Input label="Size" value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} placeholder="M" />
                    <Input label="Color" value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} placeholder="Black" />
                    <Input label="Price" type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="Default" />
                    <Input label="Disc. price" type="number" min="0" step="0.01" value={v.discountPrice} onChange={(e) => setVariant(i, { discountPrice: e.target.value })} placeholder="—" />
                    <Input label="Stock" type="number" min="0" step="1" value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} hint={v.reserved ? `${v.reserved} reserved` : undefined} />
                    <div className="col-span-2 flex items-end justify-between gap-3 sm:col-span-4 lg:col-span-1 lg:flex-col lg:items-center lg:justify-end">
                      <Toggle label="Variant active" checked={v.isActive} onChange={(on) => setVariant(i, { isActive: on })} />
                      <button type="button" onClick={() => set('variants', form.variants.filter((_, n) => n !== i))} aria-label="Remove variant" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Specifications"
            actions={<Button size="sm" variant="outline" className="h-8" onClick={() => set('specifications', [...form.specifications, { label: '', value: '' }])} icon={<Plus className="h-3.5 w-3.5" />}>Add row</Button>}
          >
            {form.specifications.length === 0 ? (
              <p className="text-sm text-slate-500">Add details like material, warranty or care instructions.</p>
            ) : (
              <div className="space-y-2">
                {form.specifications.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input aria-label="Specification name" placeholder="Material" value={s.label} onChange={(e) => set('specifications', form.specifications.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))} className="field w-1/3" />
                    <input aria-label="Specification value" placeholder="100% cotton" value={s.value} onChange={(e) => set('specifications', form.specifications.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))} className="field flex-1" />
                    <button type="button" onClick={() => set('specifications', form.specifications.filter((_, n) => n !== i))} aria-label="Remove row" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Status">
            <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value as ProductStatus)}>
              <option value="ACTIVE">Active — visible in store</option>
              <option value="INACTIVE">Inactive — hidden</option>
              <option value="DRAFT">Draft — hidden</option>
            </Select>
            <div className="mt-4 space-y-2.5">
              <Checkbox label="Featured product" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
              <Checkbox label="Trending" checked={form.isTrending} onChange={(e) => set('isTrending', e.target.checked)} />
              <Checkbox label="Best seller badge" checked={form.isBestSeller} onChange={(e) => set('isBestSeller', e.target.checked)} />
            </div>
          </Card>

          <Card title="Organisation">
            <div className="space-y-4">
              <Select label="Category" required value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, subcategoryId: '' }))} error={errors.categoryId}>
                <option value="">Select category</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label="Subcategory" value={form.subcategoryId} onChange={(e) => set('subcategoryId', e.target.value)} disabled={subcategories.length === 0} error={errors.subcategoryId}>
                <option value="">{subcategories.length ? 'None' : 'No subcategories'}</option>
                {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          </Card>

          <Card title="Inventory">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Stock" type="number" min="0" step="1" value={hasVariants ? String(form.variants.reduce((s, v) => s + Number(v.stock || 0), 0)) : form.stock} disabled={hasVariants} onChange={(e) => set('stock', e.target.value)} error={errors.stock} hint={hasVariants ? 'Sum of variant stock' : existing.data?.reserved ? `${existing.data.reserved} reserved by open orders` : undefined} />
              <Input label="Low Stock Threshold" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} error={errors.lowStockThreshold} />
            </div>
          </Card>

          <Card title="Shipping">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Weight (g)" type="number" min="0" wrapperClassName="col-span-2" value={form.weight} onChange={(e) => set('weight', e.target.value)} error={errors.weight} />
              <Input label="Length (cm)" type="number" min="0" value={form.length} onChange={(e) => set('length', e.target.value)} />
              <Input label="Width (cm)" type="number" min="0" value={form.width} onChange={(e) => set('width', e.target.value)} />
              <Input label="Height (cm)" type="number" min="0" wrapperClassName="col-span-2" value={form.height} onChange={(e) => set('height', e.target.value)} />
            </div>
          </Card>

          <Button type="submit" block loading={save.isPending}>{editing ? 'Save changes' : 'Create product'}</Button>
        </div>
      </div>
    </form>
  );
}
