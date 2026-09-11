"use client";

import { useEffect, useRef, useState } from "react";
import { createRenderer } from "./black-hole-utils/renderer";

export function Example() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createRenderer({ canvas });

    renderer.ready
      .catch((err) => {
        console.error("Renderer initialization failed:", err);
        setError("Failed to initialize renderer");
      });

    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        data-testid="black-hole-canvas"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}