import React, { useEffect, useRef, useState } from 'react';
import { DISPLAY_FONT } from '../render/view';

interface LogoTextProps {
  text: string;
  /** Font size in CSS pixels, and from the md breakpoint (768 px) up. */
  size: number;
  mdSize?: number;
  /** Sign-paint 3D shadow (red, blue, ink) like the TAKBO! lockup; off for plain lettering. */
  shadow?: boolean;
  color?: string;
  className?: string;
}

const SHADOWS = ['#d6402b', '#2b5fb8', '#15141f'];
/** Each shadow layer steps this much of the font size down and right. */
const STEP_EM = 0.04;

function useMd() {
  const [md, setMd] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = () => setMd(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return md;
}

/** Redraws when the screen's pixel density changes (zoom, or moving to another monitor). */
function useDpr() {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  useEffect(() => {
    const query = window.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [dpr]);
  return dpr;
}

/**
 * Display lettering drawn on a canvas at the screen's real pixel density. CSS text-shadow puts
 * the sign-paint layers at fractions of a pixel (0.04em), which smears the edges at small sizes
 * and on scaled Windows displays; here every layer lands on whole device pixels, so it stays crisp.
 */
export const LogoText: React.FC<LogoTextProps> = ({ text, size, mdSize, shadow = true, color = '#f2c230', className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const md = useMd();
  const dpr = useDpr();
  const px = md && mdSize ? mdSize : size;
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const font = `${Math.round(px * dpr)}px ${DISPLAY_FONT}`;
      ctx.font = font;
      const step = shadow ? Math.max(1, Math.round(px * STEP_EM * dpr)) : 0;
      const depthPx = step * SHADOWS.length;
      const textW = Math.ceil(ctx.measureText(text).width);
      const ascent = Math.ceil(px * dpr * 0.98);
      const descent = Math.ceil(px * dpr * 0.22);
      const w = textW + depthPx + 2;
      const h = ascent + descent + depthPx;
      canvas.width = w;
      canvas.height = h;
      ctx.font = font;
      ctx.textBaseline = 'alphabetic';
      if (shadow) {
        for (let i = SHADOWS.length; i >= 1; i--) {
          ctx.fillStyle = SHADOWS[i - 1];
          ctx.fillText(text, i * step, ascent + i * step);
        }
      }
      ctx.fillStyle = color;
      ctx.fillText(text, 0, ascent);
      setBox({ w: w / dpr, h: h / dpr });
    };
    draw();
    // Bungee may still be loading; draw again once it is in
    document.fonts.load(`${px}px Bungee`, text).then(draw, draw);
    return () => {
      cancelled = true;
    };
  }, [text, px, dpr, shadow, color]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={text}
      className={`block shrink-0 ${className}`}
      style={{ width: box.w || undefined, height: box.h || undefined }}
    />
  );
};
