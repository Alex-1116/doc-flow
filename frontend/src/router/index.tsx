import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/layouts/main-layout';
import Home from '@/pages/home';
import Landing from '@/pages/landing';
import NotFound from '@/pages/not-found';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    element: <MainLayout />, // 使用全局布局包裹内部页面
    children: [
      {
        path: '/home',
        element: <Home />,
      },
      // 可以在这里继续添加其他内部页面，如 /settings, /profile 等
    ]
  },
  {
    path: '*', // 捕获所有未匹配的路由
    element: <NotFound />,
  },
]);
