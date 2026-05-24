import React from 'react';

interface TableLoaderProps {
  text?: string;
}

export function TableLoader({ text = 'Cargando registros...' }: TableLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 select-none w-full h-full">
      <div className="relative w-12 h-12 flex items-center justify-center mb-4">
        {/* The outer rotating premium hexagon border */}
        <div className="hex-loader absolute w-10 h-10 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center">
          {/* Inner dark core hexagon to create a perfect high-contrast outline effect */}
          <div 
            className="w-[82%] h-[82%] bg-slate-950" 
            style={{
              clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)'
            }} 
          />
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
        {text}
      </p>
    </div>
  );
}
