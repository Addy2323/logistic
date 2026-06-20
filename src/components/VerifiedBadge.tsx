import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
  title?: string;
}

export default function VerifiedBadge({ className = "", size = 20, title = "Verified Sourcing Agent" }: VerifiedBadgeProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      className={`shrink-0 select-none inline-block ${className}`}
      aria-label={title}
    >
      <title>{title}</title>
      {/* Spiky Blue Badge background (middle design in user's image) */}
      <path 
        fill="#1DA1F2" 
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.407-.17-.867-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.407.17.867.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z" 
      />
      {/* White checkmark overlay */}
      <path 
        fill="#FFFFFF" 
        d="M10 16.5L6 12.5l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5-8 8z" 
      />
    </svg>
  );
}
