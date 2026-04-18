import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden relative">
      {/* 动态背景装饰 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-200/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 flex flex-col items-center text-center px-6"
      >
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-24 h-24 bg-white shadow-xl shadow-purple-500/10 rounded-2xl flex items-center justify-center mb-8 border border-purple-100"
        >
          <FileQuestion className="w-12 h-12 text-purple-600" />
        </motion.div>
        
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-4 tracking-tighter">
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
          页面迷路了
        </h2>
        
        <p className="text-gray-500 max-w-md mb-10 text-lg">
          抱歉，您要寻找的页面可能已被移除、重命名，或者暂时不可用。
        </p>
        
        <Button 
          onClick={() => navigate('/')}
          size="lg"
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8 h-12 text-base gap-2 shadow-lg shadow-gray-900/20 transition-all hover:-translate-y-1 cursor-pointer text-center"
        >
          <Home className="w-5 h-5" />
          返回首页
        </Button>
      </motion.div>
    </div>
  );
}