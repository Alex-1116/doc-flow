import { useEffect, useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      // Parallax calculation
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });

      // Pupil tracking calculation (only when idle)
      if (!containerRef.current || isActivating) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      // Calculate tracking with independent bounds for horizontal pill-shaped eyes
      // Allows more horizontal movement than vertical
      const distanceX = Math.min(24, Math.abs(deltaX) / 12) * Math.sign(deltaX);
      const distanceY = Math.min(8, Math.abs(deltaY) / 15) * Math.sign(deltaY);
      
      setPupilPos({ x: distanceX, y: distanceY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isActivating]);

  const handleActivate = () => {
    if (isActivating) return;
    setIsActivating(true);
    // Center the pupil and dilate immediately upon activating
    setPupilPos({ x: 0, y: 0 });
    
    // Enter system after animation completes
    setTimeout(() => navigate('/home'), 1500); 
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#030014] overflow-hidden relative selection:bg-purple-500/30">
      
      {/* Interactive Parallax Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.15] transition-transform duration-1000 ease-out"
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` 
        }}
      ></div>

      {/* Ambient glowing orbs */}
      <div 
        className={`absolute inset-0 transition-transform duration-1000 ease-out pointer-events-none ${isActivating ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}`}
        style={{ transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)` }}
      >
        <div className={`absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] transition-all duration-1000 ${isActivating ? 'animate-[pulse_2s_ease-in-out_infinite]' : 'animate-[pulse_8s_ease-in-out_infinite]'}`}></div>
        <div className={`absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-blue-600/30 rounded-full mix-blend-screen filter blur-[80px] transition-all duration-1000 ${isActivating ? 'animate-[pulse_3s_ease-in-out_infinite_reverse]' : 'animate-[pulse_10s_ease-in-out_infinite_reverse]'}`}></div>
      </div>

      <div className={`z-10 flex flex-col items-center text-center px-6 max-w-4xl w-full transition-all duration-1000 transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        
        {/* Sleek Robot Eyes Container */}
        <div className="relative mb-16 flex items-center justify-center gap-6" ref={containerRef}>
          
          {/* Background Aura */}
          <div className={`absolute inset-[-40px] bg-gradient-to-tr from-purple-600/20 to-blue-600/20 rounded-full filter blur-3xl transition-all duration-1000 ${isActivating ? 'scale-150 opacity-100' : 'scale-100 opacity-40'}`}></div>
          
          {/* Left Eye */}
          <div className={`relative w-28 h-16 bg-[#0a051e] rounded-[2rem] border shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center justify-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActivating ? 'shadow-[0_0_60px_rgba(168,85,247,0.8)] border-purple-400 scale-110' : 'border-purple-500/30 scale-100'}`}>
            
            {/* Blinking Mask (Idle State) */}
            {!isActivating && (
              <motion.div 
                className="absolute top-0 left-0 w-full bg-[#030014] z-20 border-b border-purple-500/40"
                animate={{ height: ["0%", "100%", "0%"] }}
                transition={{ 
                  duration: 0.15, 
                  repeat: Infinity, 
                  repeatDelay: 4, // Blink roughly every 4 seconds
                  ease: "easeInOut"
                }}
              />
            )}

            {/* Pupil */}
            <motion.div 
              className={`bg-purple-400 flex items-center justify-center relative z-10 transition-shadow duration-700 ${isActivating ? 'shadow-[0_0_30px_rgba(168,85,247,1)] bg-purple-300' : 'shadow-[0_0_15px_rgba(168,85,247,0.6)]'}`}
              animate={{ 
                x: pupilPos.x, 
                y: pupilPos.y, 
                width: isActivating ? 80 : 32, 
                height: isActivating ? 8 : 32,
                borderRadius: isActivating ? 4 : 16 
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Pupil Highlight */}
              <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full transition-opacity duration-500 ${isActivating ? 'opacity-0' : 'opacity-80'}`} />
            </motion.div>
          </div>

          {/* Right Eye */}
          <div className={`relative w-28 h-16 bg-[#0a051e] rounded-[2rem] border shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center justify-center overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActivating ? 'shadow-[0_0_60px_rgba(168,85,247,0.8)] border-purple-400 scale-110' : 'border-purple-500/30 scale-100'}`}>
            
            {/* Blinking Mask (Idle State) */}
            {!isActivating && (
              <motion.div 
                className="absolute top-0 left-0 w-full bg-[#030014] z-20 border-b border-purple-500/40"
                animate={{ height: ["0%", "100%", "0%"] }}
                transition={{ 
                  duration: 0.15, 
                  repeat: Infinity, 
                  repeatDelay: 4, // Synchronized blinking
                  ease: "easeInOut"
                }}
              />
            )}

            {/* Pupil */}
            <motion.div 
              className={`bg-purple-400 flex items-center justify-center relative z-10 transition-shadow duration-700 ${isActivating ? 'shadow-[0_0_30px_rgba(168,85,247,1)] bg-purple-300' : 'shadow-[0_0_15px_rgba(168,85,247,0.6)]'}`}
              animate={{ 
                x: pupilPos.x, 
                y: pupilPos.y, 
                width: isActivating ? 80 : 32, 
                height: isActivating ? 8 : 32,
                borderRadius: isActivating ? 4 : 16 
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Pupil Highlight */}
              <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full transition-opacity duration-500 ${isActivating ? 'opacity-0' : 'opacity-80'}`} />
            </motion.div>
          </div>

        </div>
        
        {/* Typographic Identity */}
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 mb-6 tracking-tighter drop-shadow-sm animate-[pulse_4s_ease-in-out_infinite]">
          DocFlow
        </h1>
        
        {/* Dynamic Subtitle */}
        <div className="relative mb-16 h-8 flex items-center justify-center">
          <p className="text-xl md:text-2xl text-slate-300/80 font-light max-w-2xl leading-relaxed tracking-widest">
            {isActivating ? "神经链路已连接，正在进入系统..." : "感知 · 理解 · 响应 —— 您的专属智能助理"}
          </p>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent blur-xl"></div>
        </div>
        
        {/* Interaction Trigger */}
        <Button 
          onClick={handleActivate}
          disabled={isActivating}
          className={`relative group text-lg px-10 py-8 h-auto rounded-full bg-slate-900/50 hover:bg-slate-800/80 border border-purple-500/30 hover:border-purple-400/60 text-white shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] transition-all duration-500 overflow-hidden backdrop-blur-md cursor-pointer ${isActivating ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}
        >
          {/* Button sweeping light effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"></div>
          
          <span className="relative z-10 flex items-center gap-3 font-medium tracking-widest">
            启动助理
            <ArrowRight className={`w-5 h-5 transition-transform duration-300 group-hover:translate-x-2`} />
          </span>
        </Button>
      </div>
    </div>
  );
}
