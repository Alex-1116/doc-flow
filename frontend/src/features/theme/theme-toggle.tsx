import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore, type ThemeMode } from '@/store/useThemeStore';

const themeOrder: ThemeMode[] = ['light', 'dark'];

function getThemeMeta(theme: ThemeMode) {
  if (theme === 'light') {
    return {
      label: '浅色',
      description: '当前为浅色模式，点击切换到深色模式',
      icon: Sun,
    };
  }

  if (theme === 'dark') {
    return {
      label: '深色',
      description: '当前为深色模式，点击切换到浅色模式',
      icon: Moon,
    };
  }

  return {
    label: '浅色',
    description: '当前为浅色模式，点击切换到深色模式',
    icon: Sun,
  };
}

function getNextTheme(theme: ThemeMode) {
  const currentIndex = themeOrder.indexOf(theme);
  return themeOrder[(currentIndex + 1) % themeOrder.length];
}

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const currentTheme = getThemeMeta(theme);
  const nextTheme = getNextTheme(theme);
  const CurrentThemeIcon = currentTheme.icon;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="rounded-full border-border bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-muted"
      title={`${currentTheme.description}（下一项：${getThemeMeta(nextTheme).label}）`}
      aria-label={`主题模式：${currentTheme.label}。点击切换到${getThemeMeta(nextTheme).label}`}
      onClick={() => setTheme(nextTheme)}
    >
      <CurrentThemeIcon className="h-4 w-4" />
    </Button>
  );
}
