import { Input } from '@/components/ui/Form';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function PasswordInput({ label, value, onChange, error, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input label={label} required type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} error={error} hint={hint} className="pr-11" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-[30px] flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:text-stone-800">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
