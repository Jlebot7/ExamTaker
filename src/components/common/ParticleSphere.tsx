import React, { useEffect, useRef } from 'react';

/**
 * Auros Bioluminescent 3D Particle Sphere
 * Renders thousands of rotating teal-cyan, white, and lavender-pink dots
 * projected on a 2D HTML5 canvas at 60fps with zero external dependencies.
 */
export const ParticleSphere: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 600;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    window.addEventListener('resize', onResize);

    // Generate points uniformly on sphere using Fibonacci sphere algorithm
    const numPoints = 1200;
    const radius = Math.min(width, height) * 0.38;
    const points: { x: number; y: number; z: number; colorType: number }[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < numPoints; i++) {
      const y = 1 - (i / (numPoints - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y
      const theta = phi * i; // golden angle increment

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Color distribution: mostly teal-cyan (0, 130, 124 / 203, 255, 252), some white, edges lavender-pink
      const rand = Math.random();
      let colorType = 0; // 0 = teal, 1 = aqua mist, 2 = white, 3 = lavender pink
      if (rand > 0.85) colorType = 3;
      else if (rand > 0.65) colorType = 2;
      else if (rand > 0.3) colorType = 1;

      points.push({ x: x * radius, y: y * radius, z: z * radius, colorType });
    }

    let angleX = 0.003;
    let angleY = 0.005;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const fov = 400;

      // Rotation matrix applications
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      // Sort points by z for proper depth rendering
      points.sort((a, b) => b.z - a.z);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Rotate Y
        let x1 = p.x * cosY + p.z * sinY;
        let z1 = -p.x * sinY + p.z * cosY;

        // Rotate X
        let y1 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;

        p.x = x1;
        p.y = y1;
        p.z = z2;

        // Perspective projection
        const scale = fov / (fov + z2 + radius);
        const projX = cx + x1 * scale;
        const projY = cy + y1 * scale;

        // Depth alpha calculation: closer points are brighter
        const alpha = Math.max(0.12, Math.min(0.95, (z2 + radius) / (2 * radius)));
        const pointSize = Math.max(1, 1.8 * scale);

        ctx.beginPath();
        ctx.arc(projX, projY, pointSize, 0, Math.PI * 2);

        if (p.colorType === 3) {
          // Lavender Phosphor Pink
          ctx.fillStyle = `rgba(253, 233, 255, ${alpha * 0.9})`;
        } else if (p.colorType === 2) {
          // Platinum White
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        } else if (p.colorType === 1) {
          // Aurora Aqua Mist
          ctx.fillStyle = `rgba(203, 255, 252, ${alpha * 0.8})`;
        } else {
          // Liquid Bioluminescent Teal
          ctx.fillStyle = `rgba(0, 130, 124, ${alpha * 0.75})`;
        }

        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full opacity-70" />
    </div>
  );
};

