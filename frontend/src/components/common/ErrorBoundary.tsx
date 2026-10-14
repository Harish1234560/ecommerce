import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface Props {
  children: ReactNode;
  /** Changing this value clears the error, so navigating away recovers the page. */
  resetKey: string;
}

// A render error in one page shows a recovery screen instead of a blank window.
class Boundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center" role="alert">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-stone-900">This page could not be displayed</h1>
        <p className="mt-1.5 max-w-sm text-sm text-stone-500">Something went wrong while showing this page. Reloading usually fixes it.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.assign('/')}>
            Go to home page
          </Button>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}
