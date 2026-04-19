import { NavLink } from 'react-router-dom';
import { FileText, Files, LayoutDashboard } from 'lucide-react';
import { cn } from '@/libs/utils';

const navItems = [
  { to: '/home', label: '工作台', icon: LayoutDashboard },
  { to: '/documents', label: '文档管理', icon: Files },
];

export default function LayoutHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DocFlow</h1>
            <p className="text-sm text-gray-500">智能文档摘要与问答系统</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
