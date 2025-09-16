"use client";

import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
  onSignatureChange: (signature: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({ 
  onSignatureChange, 
  width = 400, 
  height = 200, 
  className = '' 
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setHasSignature(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const signature = canvas.toDataURL('image/png');
        onSignatureChange(signature);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    setHasSignature(false);
    onSignatureChange('');
  };

  return (
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="cursor-crosshair border border-gray-200 rounded"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      <div className="flex justify-between items-center mt-2">
        <p className="text-sm text-gray-500">
          {hasSignature ? 'Signature captured' : 'Sign above'}
        </p>
        <button
          onClick={clearSignature}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
