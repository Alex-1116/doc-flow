import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 可以在这里添加全局通用的导航栏 (Navbar) */}
      <main className="flex-1 w-full overflow-hidden flex flex-col">
        <Outlet />
      </main>
      {/* 可以在这里添加全局通用的页脚 (Footer) */}
    </div>
  );
}