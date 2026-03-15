import { useEffect, useRef, useCallback } from "react";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  hue: number;
}

interface FBlob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
  phase: number;
  speed: number;
}

const BLOB_CONFIGS = [
  { hue: 270, sat: 80, light: 60, darkLight: 65, op: 0.09, darkOp: 0.1 },
  { hue: 200, sat: 70, light: 60, darkLight: 55, op: 0.07, darkOp: 0.08 },
  { hue: 280, sat: 90, light: 65, darkLight: 70, op: 0.08, darkOp: 0.09 },
  { hue: 240, sat: 60, light: 55, darkLight: 50, op: 0.05, darkOp: 0.07 },
  { hue: 310, sat: 70, light: 58, darkLight: 62, op: 0.06, darkOp: 0.07 },
];

const FluidBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const blobs = useRef<FBlob[]>([]);
  const animRef = useRef<number>(0);

  const isDark = () => document.documentElement.classList.contains("dark");

  const initBlobs = useCallback((w: number, h: number) => {
    const dark = isDark();
    blobs.current = BLOB_CONFIGS.map((cfg, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.min(w, h) * (0.18 + Math.random() * 0.14),
      hue: cfg.hue,
      saturation: cfg.sat,
      lightness: dark ? cfg.darkLight : cfg.light,
      opacity: dark ? cfg.darkOp : cfg.op,
      phase: (i * Math.PI * 2) / BLOB_CONFIGS.length,
      speed: 0.3 + Math.random() * 0.3,
    }));
  }, []);

  const addRipple = useCallback((x: number, y: number) => {
    const hues = [270, 200, 280, 310];
    ripples.current.push({
      x, y,
      radius: 0,
      maxRadius: 200 + Math.random() * 150,
      alpha: 1,
      hue: hues[Math.floor(Math.random() * hues.length)],
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
      if (blobs.current.length === 0) initBlobs(window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    // Listen on document so touches pass through canvas (pointer-events: none)
    const handleTouch = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        addRipple(e.touches[i].clientX, e.touches[i].clientY);
      }
    };
    const handleMouse = (e: MouseEvent) => {
      addRipple(e.clientX, e.clientY);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons === 1) addRipple(e.clientX, e.clientY);
    };

    document.addEventListener("touchstart", handleTouch, { passive: true });
    document.addEventListener("touchmove", handleTouch, { passive: true });
    document.addEventListener("mousedown", handleMouse);
    document.addEventListener("mousemove", handleMouseMove);

    // Theme change watcher
    const observer = new MutationObserver(() => {
      const dark = isDark();
      blobs.current.forEach((b, i) => {
        const cfg = BLOB_CONFIGS[i % BLOB_CONFIGS.length];
        b.lightness = dark ? cfg.darkLight : cfg.light;
        b.opacity = dark ? cfg.darkOp : cfg.op;
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let time = 0;
    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const animate = () => {
      time += 0.008;
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);

      // Draw blobs with soft radial gradients
      for (const blob of blobs.current) {
        blob.x += blob.vx * blob.speed;
        blob.y += blob.vy * blob.speed;

        const wobbleX = Math.sin(time * blob.speed * 1.5 + blob.phase) * 40;
        const wobbleY = Math.cos(time * blob.speed * 1.2 + blob.phase) * 35;

        if (blob.x < -blob.radius * 0.5) blob.vx = Math.abs(blob.vx);
        if (blob.x > cw + blob.radius * 0.5) blob.vx = -Math.abs(blob.vx);
        if (blob.y < -blob.radius * 0.5) blob.vy = Math.abs(blob.vy);
        if (blob.y > ch + blob.radius * 0.5) blob.vy = -Math.abs(blob.vy);

        const r = blob.radius + Math.sin(time * 2.5 + blob.phase) * 20;
        const bx = blob.x + wobbleX;
        const by = blob.y + wobbleY;

        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, r);
        gradient.addColorStop(0, `hsla(${blob.hue}, ${blob.saturation}%, ${blob.lightness}%, ${blob.opacity})`);
        gradient.addColorStop(0.6, `hsla(${blob.hue}, ${blob.saturation}%, ${blob.lightness}%, ${blob.opacity * 0.4})`);
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw ripples — fast expanding, visible
      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const rip = ripples.current[i];
        rip.radius += 5;
        rip.alpha *= 0.955;

        if (rip.alpha < 0.01 || rip.radius > rip.maxRadius) {
          ripples.current.splice(i, 1);
          continue;
        }

        const dark = isDark();
        const baseLightness = dark ? 65 : 60;
        const baseAlpha = dark ? 0.35 : 0.25;

        // Outer ring
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${rip.hue}, 80%, ${baseLightness}%, ${rip.alpha * baseAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner ring
        if (rip.radius > 20) {
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${rip.hue}, 85%, ${baseLightness + 5}%, ${rip.alpha * baseAlpha * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Radial fill glow
        const grad = ctx.createRadialGradient(rip.x, rip.y, 0, rip.x, rip.y, rip.radius);
        grad.addColorStop(0, `hsla(${rip.hue}, 80%, ${baseLightness}%, ${rip.alpha * 0.12})`);
        grad.addColorStop(0.5, `hsla(${rip.hue}, 80%, ${baseLightness}%, ${rip.alpha * 0.05})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("touchstart", handleTouch);
      document.removeEventListener("touchmove", handleTouch);
      document.removeEventListener("mousedown", handleMouse);
      document.removeEventListener("mousemove", handleMouseMove);
      observer.disconnect();
    };
  }, [addRipple, initBlobs]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default FluidBackground;
