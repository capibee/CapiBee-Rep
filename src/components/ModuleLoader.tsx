import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface ModuleLoaderProps {
  moduleName: string;
}

export default function ModuleLoader({ moduleName }: ModuleLoaderProps) {
  const [loadingText, setLoadingText] = useState("Preparando entorno...");

  useEffect(() => {
    const texts = [
      "Preparando entorno...",
      "Sincronizando datos...",
      "Optimizando módulos...",
      "Desplegando interfaz..."
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md select-none overflow-hidden">
      {/* Background ultra soft ambient glow */}
      <div className="absolute w-[400px] h-[400px] bg-amber-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-sm px-6 text-center z-10 w-full">
        {/* Custom High-Fidelity Animated Logo */}
        <div className="mb-8 flex justify-center items-center">
          <motion.div
            className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center"
            initial={{ y: 0, opacity: 0, scale: 0.95 }}
            animate={{
              y: [-8, 8, -8],
              opacity: 1,
              scale: 1,
            }}
            transition={{
              y: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              },
              opacity: { duration: 0.6 },
              scale: { duration: 0.6 },
            }}
          >
            {/* The transparent logo */}
            <img
              src="https://i.ibb.co/G4W60yY5/Logo-Capibee-2-removebg-preview.png"
              alt="CapiBee"
              className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(250,204,21,0.4)] mix-blend-screen"
            />
          </motion.div>
        </div>

        {/* Clean, minimalist modern micro-copy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <h3 className="text-sm sm:text-base font-medium text-slate-200 tracking-[0.25em] uppercase mb-4">
            {moduleName}
          </h3>
          
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
            <motion.p 
              key={loadingText}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 0.6, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] sm:text-xs text-slate-300 font-mono uppercase tracking-[0.2em]"
            >
              {loadingText}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
