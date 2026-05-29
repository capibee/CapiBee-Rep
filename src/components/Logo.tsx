import React from 'react';

export default function Logo({ className = "", size = 60, textClassName = "" }: { className?: string, size?: number, textClassName?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img 
        src="https://i.ibb.co/G4W60yY5/Logo-Capibee-2-removebg-preview.png" 
        alt="CapiBee" 
        style={{ 
          height: size ? `${size}px` : 'auto',
          width: 'auto',
          maxWidth: '105%',
          filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))",
          mixBlendMode: "screen"
        }}
        className="object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}


