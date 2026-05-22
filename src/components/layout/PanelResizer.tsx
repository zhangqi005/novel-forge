'use client';

import { useCallback, useRef, useEffect } from 'react';

interface PanelResizerProps {
  onResize: (delta: number) => void;
  direction: 'horizontal' | 'vertical';
}

export default function PanelResizer({ onResize, direction }: PanelResizerProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const current = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = current - startXRef.current;
      if (Math.abs(delta) > 2) {
        onResize(delta);
        startXRef.current = current;
      }
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, onResize]);

  const isH = direction === 'horizontal';

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`flex-shrink-0 bg-[var(--border-color)] hover:bg-[var(--accent)] transition-colors duration-200 cursor-col-resize group
        ${isH ? 'w-1 hover:w-1' : 'h-1 hover:h-1'}`}
      style={{ cursor: isH ? 'col-resize' : 'row-resize' }}
    >
      {/* Invisible larger hit area */}
      <div className={`${isH ? 'w-3 -ml-1' : 'h-3 -mt-1'} h-full`} />
    </div>
  );
}
