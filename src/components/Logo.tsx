import React from 'react';

export default function Logo({ className = "", size = 120, textClassName = "" }: { className?: string, size?: number, textClassName?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0px 4px 5px rgba(0,0,0,0.4))" }}
      >
        <defs>
          <mask id="stripe-mask">
            <rect width="120" height="120" fill="white" />
            <path d="M 30 110 L 110 30" stroke="black" strokeWidth="6.5" />
            <path d="M 42 122 L 122 42" stroke="black" strokeWidth="6.5" />
            <path d="M 54 134 L 134 54" stroke="black" strokeWidth="6.5" />
            
            <path d="M 18 98 L 98 18" stroke="black" strokeWidth="6.5" />
            <path d="M 6 86 L 86 6" stroke="black" strokeWidth="6.5" />
            <path d="M -6 74 L 74 -6" stroke="black" strokeWidth="6.5" />
            
            {/* Make sure the eye is masked out to be transparent */}
            <circle cx="34" cy="56" r="2.5" fill="black" />
          </mask>
        </defs>

        {/* Wings */}
        <path d="M54 52 C 60 20, 110 28, 78 60 C 65 72, 54 52, 54 52 Z" fill="white" />
        <path d="M50 62 C 76 34, 110 50, 80 76 C 65 88, 50 62, 50 62 Z" fill="white" />

        {/* Body and Head masked together */}
        <g mask="url(#stripe-mask)">
          {/* Main bee body */}
          <ellipse cx="58" cy="76" rx="26" ry="28" fill="white" transform="rotate(-35 58 76)" />
          
          {/* Capybara Head */}
          <path d="M 44 60 
                   C 36 50, 22 55, 18 60 
                   C 14 62, 14 64, 17 66
                   C 19 65, 23 68, 25 70
                   C 32 75, 42 78, 50 72 Z" fill="white" />
                   
          {/* Little Ear detail */}
          <ellipse cx="38" cy="50" rx="3.5" ry="5.5" fill="white" transform="rotate(15 38 50)"/>
        </g>
      </svg>
      <span style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.3)" }} className={`font-display font-bold text-white mt-1 ${textClassName}`}>
        CapiBee
      </span>
    </div>
  );
}

