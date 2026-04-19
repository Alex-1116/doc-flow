import { Outlet } from 'react-router-dom';
import LayoutHeader from '@/layouts/header';

export default function MainLayout() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <LayoutHeader />

      <main className="flex-1 min-h-0 w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
