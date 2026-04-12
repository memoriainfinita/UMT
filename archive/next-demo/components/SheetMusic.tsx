'use client';

import { useEffect, useRef } from 'react';
import abcjs from 'abcjs';

interface SheetMusicProps {
  abcNotation: string;
  className?: string;
  responsive?: 'resize' | undefined;
}

export function SheetMusic({ abcNotation, className = '', responsive = 'resize' }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && abcNotation) {
      abcjs.renderAbc(containerRef.current, abcNotation, {
        responsive,
        add_classes: true,
        paddingtop: 10,
        paddingbottom: 10,
        paddingright: 10,
        paddingleft: 10,
        staffwidth: 600,
        foregroundColor: '#e5e5e5', // Tailwind neutral-200
      });
    }
  }, [abcNotation, responsive]);

  return (
    <div 
      ref={containerRef} 
      className={`bg-neutral-900 rounded-lg overflow-hidden [&_svg]:w-full ${className}`}
    />
  );
}
