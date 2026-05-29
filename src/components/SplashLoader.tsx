import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashLoaderProps {
  onComplete?: () => void;
  message?: string;
}

export default function SplashLoader({ onComplete }: SplashLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Iniciando sistema...');

  const phrases = [
    { threshold: 0, text: 'Iniciando sistema...' },
    { threshold: 25, text: 'Sincronizando datos...' },
    { threshold: 50, text: 'Conectando base segura...' },
    { threshold: 75, text: 'Cargando interfaces...' },
    { threshold: 92, text: 'Finalizando...' }
  ];

  useEffect(() => {
    const duration = 2400; // 2.4s for smooth backend loading
    const intervalTime = 30;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const nextProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(nextProgress);

      const phrase = phrases.reduce((best, item) => {
        if (nextProgress >= item.threshold) {
          return item.text;
        }
        return best;
      }, phrases[0].text);
      
      setStatusText(phrase);

      if (currentStep >= steps) {
        clearInterval(timer);
        if (onComplete) {
          setTimeout(onComplete, 250);
        }
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden select-none">
      {/* Background soft ambient radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/[0.04] rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-xs w-full px-6">
        {/* Subtle Brand Logo / Identifier */}
        <div className="mb-6 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-lg font-normal tracking-[0.3em] text-white/90"
          >
            CAPI<span className="font-bold text-amber-500">BEE</span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-[8px] text-slate-400 font-mono tracking-[0.4em] uppercase mt-1.5"
          >
            Plataforma Inteligente
          </motion.div>
        </div>

        {/* Custom High-Fidelity Custom Hex Spinner */}
        <div className="mb-6 flex justify-center items-center">
          <div className="relative w-14 h-14 flex items-center justify-center">
            {/* The outer rotating premium hexagon border */}
            <div className="hex-loader absolute w-12 h-12 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center">
              {/* Inner dark core hexagon to create a perfect high-contrast outline effect */}
              <div 
                className="w-[82%] h-[82%] bg-slate-950" 
                style={{
                  clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)'
                }} 
              />
            </div>
          </div>
        </div>

        {/* Status Line - Subtle */}
        <div className="h-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusText}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="text-[9px] font-medium text-slate-300 tracking-[0.15em] uppercase font-sans selection:bg-none"
            >
              {statusText}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer subtle tag */}
      <div className="absolute bottom-8 text-center select-none opacity-20">
        <span className="text-[8px] text-slate-400 font-medium uppercase tracking-[0.2em]">
          CapiBee Kernel
        </span>
      </div>
    </div>
  );
}
