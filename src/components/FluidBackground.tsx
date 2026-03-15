import { useEffect, useRef, useCallback } from "react";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  phase: number;
  speed: number;
}

const FluidBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const blobs = useRef<Blob[]>([]);
  const animRef = useRef<number>(0);
  const isDark = useRef(false);

  const getColors = useCallback(() => {
    const root = getComputedStyle(document.documentElement);
    const dark = document.documentElement.classList.contains("dark");
    isDark.current = dark;

    if (dark) {
      return {
        blobs: [
          "hsla(270, 80%, 65%, 0.08)",
          "hsla(200, 70%, 55%, 0.06)",
          "hsla(280, 90%, 70%, 0.07)",
          "hsla(240, 60%, 50%, 0.05)",
        ],
        ripple: [
          "hsla(270, 80%, 65%, 0.25)",
          "hsla(200, 70%, 55%, 0.2)",
          "hsla(280, 90%, 70%, 0.22)",
        ],
      };
    }
    return {
      blobs: [
        "hsla(270, 80%, 60%, 0.07)",
        "hsla(200, 70%, 60%, 0.05)",
        "hsla(280, 90%, 65%, 0.06)",
        "hsla(240, 60%, 55%, 0.04)",
      ],
      ripple: [
        "hsla(270, 80%, 60%, 0.2)",
        "hsla(200, 70%, 60%, 0.18)",
        "hsla(280, 90%, 65%, 0.2)",
      ],
    };
  }, []);

  const initBlobs = useCallback((w: number, h: number) => {
    const colors = getColors();
    blobs.current = colors.blobs.map((color, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.min(w, h) * (0.15 + Math.random() * 0.15),
      color,
      phase: (i * Math.PI * 2) / colors.blobs.length,
      speed: 0.3 + Math.random() * 0.4,
    }));
  }, [getColors]);

  const addRipple = useCallback((x: number, y: number) => {
    const colors = getColors();
    const color = colors.ripple[Math.floor(Math.random() * colors.ripple.length)];
    ripples.current.push({
      x, y,
      radius: 0,
      maxRadius: 150 + Math.random() * 100,
      alpha: 1,
      color,
    });
  }, [getColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (blobs.current.length === 0) initBlobs(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleInteraction = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const touches = "touches" in e ? e.touches : [e];
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        addRipple(t.clientX - rect.left, t.clientY - rect.top);
      }
    };

    canvas.addEventListener("mousedown", handleInteraction);
    canvas.addEventListener("mousemove", (e) => {
      if (e.buttons === 1) handleInteraction(e);
    });
    canvas.addEventListener("touchstart", handleInteraction, { passive: true });
    canvas.addEventListener("touchmove", handleInteraction, { passive: true });

    // Watch theme changes
    const observer = new MutationObserver(() => {
      const colors = getColors();
      blobs.current.forEach((b, i) => {
        b.color = colors.blobs[i % colors.blobs.length];
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let time = 0;
    const animate = () => {
      time += 0.01;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw blobs
      for (const blob of blobs.current) {
        blob.x += blob.vx * blob.speed;
        blob.y += blob.vy * blob.speed;

        // Organic wobble
        const wobbleX = Math.sin(time * blob.speed + blob.phase) * 30;
        const wobbleY = Math.cos(time * blob.speed * 0.8 + blob.phase) * 25;

        // Bounce
        if (blob.x < -blob.radius) blob.vx = Math.abs(blob.vx);
        if (blob.x > w + blob.radius) blob.vx = -Math.abs(blob.vx);
        if (blob.y < -blob.radius) blob.vy = Math.abs(blob.vy);
        if (blob.y > h + blob.radius) blob.vy = -Math.abs(blob.vy);

        const r = blob.radius + Math.sin(time * 2 + blob.phase) * 15;
        const gradient = ctx.createRadialGradient(
          blob.x + wobbleX, blob.y + wobbleY, 0,
          blob.x + wobbleX, blob.y + wobbleY, r
        );
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(blob.x + wobbleX, blob.y + wobbleY, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw ripples
      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const rip = ripples.current[i];
        rip.radius += 3;
        rip.alpha *= 0.97;

        if (rip.alpha < 0.01 || rip.radius > rip.maxRadius) {
          ripples.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = rip.color.replace(/[\d.]+\)$/, `${rip.alpha * 0.6})`);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner glow
        const grad = ctx.createRadialGradient(rip.x, rip.y, 0, rip.x, rip.y, rip.radius);
        grad.addColorStop(0, rip.color.replace(/[\d.]+\)$/, `${rip.alpha * 0.15})`));
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, [addRipple, getColors, initBlobs]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
    />
  );
};

export default FluidBackground;
