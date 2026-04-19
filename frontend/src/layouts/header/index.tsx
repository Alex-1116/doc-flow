import { NavLink } from 'react-router-dom';
import { FileText, Files, LayoutDashboard } from 'lucide-react';
import ThemeToggle from '@/features/theme/theme-toggle';
import { cn } from '@/libs/utils';

const navItems = [
  { to: '/home', label: '工作台', icon: LayoutDashboard },
  { to: '/documents', label: '文档管理', icon: Files },
];

export default function LayoutHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-500">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">DocFlow</h1>
            <p className="text-sm text-muted-foreground">智能文档摘要与问答系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 rounded-full border border-border bg-muted/80 p-1">
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
                        ? 'bg-background text-violet-700 shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
