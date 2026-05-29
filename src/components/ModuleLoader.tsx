import { motion } from 'motion/react';

interface ModuleLoaderProps {
  moduleName: string;
}

export default function ModuleLoader({ moduleName }: ModuleLoaderProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-sm select-none">
      {/* Background ultra soft ambient glow */}
      <div className="absolute w-56 h-56 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-xs px-4 text-center">
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

        {/* Clean, well-spaced modern micro-copy */}
        <p className="text-[10px] font-bold text-amber-500/80 font-sans uppercase tracking-[0.25em] mb-1">
          CARGANDO
        </p>
        <h3 className="text-xs font-semibold text-slate-200 tracking-[0.1em] uppercase truncate max-w-[180px]">
          {moduleName}
        </h3>

        {/* Faint subtext */}
        <span className="text-[9px] text-slate-500 font-medium tracking-widest uppercase mt-4 opacity-40">
          Sincronizando...
        </span>
      </div>
    </div>
  );
}
