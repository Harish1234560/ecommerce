import { PageSpinner } from '@/components/ui/Feedback';
import { Sidebar } from '@/layouts/admin/Sidebar';
import { toast } from '@/store/toast';
import { useAuth } from '@/store/auth';
import { LogOut, Menu, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="admin min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block"><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 animate-fade-in"><Sidebar onNavigate={() => setOpen(false)} /></div>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute left-[17rem] top-4 rounded-full bg-white/10 p-2 text-white"><X className="h-5 w-5" /></button>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{user?.name.charAt(0).toUpperCase()}</span>
            <button
              onClick={async () => {
                await logout();
                toast.success('Signed out');
                navigate('/admin/login');
              }}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
