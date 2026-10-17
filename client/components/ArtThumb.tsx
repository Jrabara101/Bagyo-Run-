import React, { useEffect, useRef } from 'react';
import type { HazardId } from '../../shared/content/hazards';
import type { CollectibleEntity } from '../../shared/sim/types';
import { View } from '../render/view';
import { drawHazard } from '../render/art/hazards';
import { drawCollectible } from '../render/art/items';

const W = 140;
const H = 120;
/** A close-up of one lane: the middle lane about 90 px wide, standing on y ≈ 100. */
const VIEW: View = { W, H: 105, hy: 0, vx: W / 2, bw: 142, tw: 0 };

type Subject = { hazard: HazardId } | { item: Pick<CollectibleEntity, 'type' | 'itemId'> };

/** A still of one hazard or item, drawn with the game's own art functions. */
export const ArtThumb: React.FC<{ subject: Subject; ground?: string; label: string }> = ({ subject, ground = '#55585c', label }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2a2838';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 88, W, H - 88);
    if ('hazard' in subject) {
      drawHazard(ctx, VIEW, subject.hazard, 1, 0, 0.6, 0.5);
    } else {
      const col: CollectibleEntity = { id: 'thumb', lane: 1, zPos: 0, yOffset: 0, collected: false, ...subject.item };
      // Items are small in the game; show them at twice that size, centered
      ctx.translate(W / 2, 58);
      ctx.scale(2, 2);
      ctx.translate(-W / 2, -72);
      drawCollectible(ctx, VIEW, col, 0, 0.2);
    }
  }, [subject, ground]);

  return <canvas ref={ref} role="img" aria-label={label} style={{ width: W, height: H }} className="rounded-md block" />;
};
