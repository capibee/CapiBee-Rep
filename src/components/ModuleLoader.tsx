import { motion } from "motion/react";

interface ModuleLoaderProps {
  moduleName: string;
}

export default function ModuleLoader({ moduleName }: ModuleLoaderProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-sm select-none">
      {/* Background ultra soft ambient glow */}
      <div className="absolute w-56 h-56 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-xs px-4 text-center">
        {/* Custom High-Fidelity Custom Hex Spinner replaced with Animated Logo */}
        <div className="mb-6 flex justify-center items-center">
          <motion.div
            className="relative w-20 h-20 flex items-center justify-center"
            initial={{ y: 0, boxShadow: "0px 0px 0px rgba(250,204,21,0)" }}
            animate={{
              y: [-4, 4, -4],
              boxShadow: [
                "0px 4px 20px rgba(250,204,21,0.1)",
                "0px 10px 30px rgba(250,204,21,0.3)",
                "0px 4px 20px rgba(250,204,21,0.1)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <img
              src="https://i.ibb.co/G4W60yY5/Logo-Capibee-2-removebg-preview.png"
              alt="CapiBee"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
            />
          </motion.div>
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
