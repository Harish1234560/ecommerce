import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'brand' | 'outline' | 'ghost' | 'danger' | 'soft';

type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'btn-primary',
  brand: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  outline: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 active:bg-stone-100',
  ghost: 'text-stone-700 hover:bg-stone-100 active:bg-stone-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  soft: 'bg-stone-100 text-stone-800 hover:bg-stone-200',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', block = false) {
  return clsx(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT[variant],
    SIZE[size],
    block && 'w-full',
  );
}

export function Button({ variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={clsx(buttonClass(variant, size, block), className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx('inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
