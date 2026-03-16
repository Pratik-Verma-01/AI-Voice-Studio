import { useEffect, useRef } from "react";

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
];

const MAX_RIPPLES = 8;
const RIPPLE_THROTTLE_MS = 60;

const FluidBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ripples: [] as Ripple[],
    blobs: [] as FBlob[],
    animId: 0,
    time: 0,
    dark: false,
    lastRippleTime: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const s = stateRef.current;

    // Use DPR 1 always for performance
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      if (s.blobs.length === 0) {
        s.dark = document.documentElement.classList.contains("dark");
        s.blobs = BLOB_CONFIGS.map((cfg, i) => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.min(w, h) * (0.2 + Math.random() * 0.12),
          hue: cfg.hue,
          saturation: cfg.sat,
          lightness: s.dark ? cfg.darkLight : cfg.light,
          opacity: s.dark ? cfg.darkOp : cfg.op,
          phase: (i * Math.PI * 2) / BLOB_CONFIGS.length,
          speed: 0.3 + Math.random() * 0.2,
        }));
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const addRipple = (x: number, y: number) => {
      const now = performance.now();
      if (now - s.lastRippleTime < RIPPLE_THROTTLE_MS) return;
      s.lastRippleTime = now;
      if (s.ripples.length >= MAX_RIPPLES) s.ripples.shift();
      const hues = [270, 200, 280];
      s.ripples.push({
        x, y, radius: 0,
        maxRadius: 180 + Math.random() * 100,
        alpha: 1,
        hue: hues[(Math.random() * hues.length) | 0],
      });
    };

    const onTouch = (e: TouchEvent) => {
      addRipple(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onMouse = (e: MouseEvent) => addRipple(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => {
      if (e.buttons === 1) addRipple(e.clientX, e.clientY);
    };

    document.addEventListener("touchstart", onTouch, { passive: true });
    document.addEventListener("touchmove", onTouch, { passive: true });
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("mousemove", onMouseMove);

    const observer = new MutationObserver(() => {
      s.dark = document.documentElement.classList.contains("dark");
      s.blobs.forEach((b, i) => {
        const cfg = BLOB_CONFIGS[i % BLOB_CONFIGS.length];
        b.lightness = s.dark ? cfg.darkLight : cfg.light;
        b.opacity = s.dark ? cfg.darkOp : cfg.op;
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const animate = () => {
      s.time += 0.006;
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      // Blobs
      for (const b of s.blobs) {
        b.x += b.vx * b.speed;
        b.y += b.vy * b.speed;
        if (b.x < -b.radius * 0.5) b.vx = Math.abs(b.vx);
        if (b.x > cw + b.radius * 0.5) b.vx = -Math.abs(b.vx);
        if (b.y < -b.radius * 0.5) b.vy = Math.abs(b.vy);
        if (b.y > ch + b.radius * 0.5) b.vy = -Math.abs(b.vy);

        const r = b.radius + Math.sin(s.time * 2 + b.phase) * 15;
        const bx = b.x + Math.sin(s.time * b.speed + b.phase) * 30;
        const by = b.y + Math.cos(s.time * b.speed * 0.8 + b.phase) * 25;

        const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
        g.addColorStop(0, `hsla(${b.hue},${b.saturation}%,${b.lightness}%,${b.opacity})`);
        g.addColorStop(0.6, `hsla(${b.hue},${b.saturation}%,${b.lightness}%,${b.opacity * 0.3})`);
        g.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, 6.2832);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // Ripples — single ring only for speed
      const dark = s.dark;
      const bl = dark ? 65 : 60;
      const ba = dark ? 0.3 : 0.2;

      for (let i = s.ripples.length - 1; i >= 0; i--) {
        const rip = s.ripples[i];
        rip.radius += 4;
        rip.alpha *= 0.94;

        if (rip.alpha < 0.02 || rip.radius > rip.maxRadius) {
          s.ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, 6.2832);
        ctx.strokeStyle = `hsla(${rip.hue},80%,${bl}%,${rip.alpha * ba})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      s.animId = requestAnimationFrame(animate);
    };

    s.animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(s.animId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("touchstart", onTouch);
      document.removeEventListener("touchmove", onTouch);
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("mousemove", onMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default FluidBackground;
