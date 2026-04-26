import { Outlet } from 'react-router-dom';
import LayoutHeader from '@/layouts/header';
import { ErrorBoundary } from '@/components/error-boundary';

export default function MainLayout() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <LayoutHeader />

      <main className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
