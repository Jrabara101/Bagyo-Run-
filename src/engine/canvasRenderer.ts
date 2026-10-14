import { TrackChunk, ObstacleEntity, CollectibleEntity, PlayerPhysicsState, LaneIndex } from '../types/game';
import { LANE_X_POSITIONS } from './kinematicController';

export interface RenderParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface NearMissSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface CameraState {
  x: number;
  y: number;
  tilt: number;
  shakeTime: number;
  shakeIntensity: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: RenderParticle[] = [];
  private sparks: NearMissSpark[] = [];
  private camera: CameraState = { x: 0, y: 0, tilt: 0, shakeTime: 0, shakeIntensity: 0 };
  private starfield: { x: number; y: number; size: number; alpha: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not obtain 2D canvas context');
    this.ctx = context;

    // Generate random background stars for orbital biome
    for (let i = 0; i < 90; i++) {
      this.starfield.push({
        x: Math.random(),
        y: Math.random() * 0.45,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public triggerScreenShake(intensity = 1.0) {
    this.camera.shakeTime = 0.35;
    this.camera.shakeIntensity = intensity * 14;
  }

  public addNearMissSparks(screenX: number, screenY: number, count = 22) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 280 + 120;
      this.sparks.push({
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.45 + Math.random() * 0.25,
        color: Math.random() > 0.4 ? '#4cd7f6' : '#fbabff',
      });
    }
  }

  public addCoinBurst(screenX: number, screenY: number) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 80;
      this.sparks.push({
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.35 + Math.random() * 0.2,
        color: '#f7be1d',
      });
    }
  }

  /**
   * Transforms 3D track coordinates (x: -1.5..1.5, y: height, z: relative distance ahead)
   * into 2D Screen space with perspective projection.
   */
  public project(x: number, y: number, zRel: number): { x: number; y: number; scale: number; visible: boolean } {
    if (zRel <= 0.5) return { x: 0, y: 0, scale: 0, visible: false };

    const fov = 320;
    const horizonY = this.canvas.height * 0.42;
    const scale = fov / (fov + zRel * 4.2);

    const centerX = this.canvas.width * 0.5 + this.camera.x;
    const trackWidthAtBottom = this.canvas.width * 0.72;

    const screenX = centerX + x * (trackWidthAtBottom * 0.5) * scale;
    const roadY = horizonY + (this.canvas.height - horizonY) * scale;
    const screenY = roadY - y * scale * 2.8;

    return {
      x: screenX,
      y: screenY,
      scale,
      visible: zRel > 0 && zRel < 180,
    };
  }

  /**
   * Main render pass
   */
  public render(
    dt: number,
    player: PlayerPhysicsState,
    playerZ: number,
    chunks: TrackChunk[],
    biome: 'neon_city' | 'sky_bridge' | 'magma_vault',
    isOverdrive: boolean,
    ghostZ: number | null,
    ghostLane: LaneIndex | null,
    screenShakeSetting = 1.0,
    cameraTiltSetting = 1.0
  ) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Update screen shake
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.camera.shakeTime > 0) {
      this.camera.shakeTime -= dt;
      const mag = this.camera.shakeIntensity * screenShakeSetting * (this.camera.shakeTime / 0.35);
      shakeOffsetX = (Math.random() * 2 - 1) * mag;
      shakeOffsetY = (Math.random() * 2 - 1) * mag;
    }

    // Camera tilt on lane switching
    const targetTilt = (player.currentX - player.targetX) * 0.12 * cameraTiltSetting;
    this.camera.tilt += (targetTilt - this.camera.tilt) * Math.min(1.0, dt * 10);

    ctx.save();
    ctx.translate(shakeOffsetX, shakeOffsetY);
    if (Math.abs(this.camera.tilt) > 0.001) {
      ctx.translate(width / 2, height * 0.6);
      ctx.rotate(this.camera.tilt);
      ctx.translate(-width / 2, -height * 0.6);
    }

    // 1. Draw Biome Sky & Horizon
    this.renderHorizon(biome, isOverdrive);

    // 2. Draw 3-Lane Highway Track Grid
    this.renderTrack(playerZ, biome, isOverdrive);

    // 3. Render In-World Obstacles & Collectibles from active chunks
    this.renderEntities(chunks, playerZ, biome);

    // 4. Render Ghost Hologram Runner (if available)
    if (ghostZ !== null && ghostLane !== null) {
      this.renderGhost(playerZ, ghostZ, ghostLane);
    }

    // 5. Render Player Hovercraft Avatar
    this.renderPlayer(player, isOverdrive, biome);

    // 6. Render Overdrive / Speed Streaks & Dynamic Sparks
    this.renderSparksAndSpeedLines(dt, isOverdrive);

    ctx.restore();
  }

  private renderHorizon(biome: 'neon_city' | 'sky_bridge' | 'magma_vault', isOverdrive: boolean) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;
    const horizonY = height * 0.42;

    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    if (biome === 'neon_city') {
      skyGrad.addColorStop(0, '#020612');
      skyGrad.addColorStop(0.65, '#061327');
      skyGrad.addColorStop(1, isOverdrive ? '#260a3a' : '#0d223f');
    } else if (biome === 'sky_bridge') {
      skyGrad.addColorStop(0, '#01040a');
      skyGrad.addColorStop(0.7, '#071833');
      skyGrad.addColorStop(1, '#0e3860');
    } else {
      // Magma Vault
      skyGrad.addColorStop(0, '#0a0202');
      skyGrad.addColorStop(0.7, '#240808');
      skyGrad.addColorStop(1, '#3f130b');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY + 2);

    // Biome specific backdrop features
    if (biome === 'sky_bridge') {
      // Twinkling Starfield
      ctx.fillStyle = '#ffffff';
      for (const star of this.starfield) {
        ctx.globalAlpha = star.alpha;
        ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
      }
      ctx.globalAlpha = 1.0;

      // Distant Orbital Halo Ring
      ctx.save();
      ctx.strokeStyle = 'rgba(76, 215, 246, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(width * 0.5, horizonY * 0.8, width * 0.38, 48, -0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (biome === 'neon_city') {
      // Distant Cyber Monolith Silhouettes
      const monoliths = [
        { x: 0.12, w: 0.05, h: 0.22 },
        { x: 0.24, w: 0.07, h: 0.32 },
        { x: 0.38, w: 0.04, h: 0.18 },
        { x: 0.62, w: 0.06, h: 0.26 },
        { x: 0.76, w: 0.08, h: 0.35 },
        { x: 0.88, w: 0.04, h: 0.2 },
      ];
      ctx.fillStyle = 'rgba(6, 25, 48, 0.7)';
      for (const m of monoliths) {
        const mx = m.x * width;
        const mw = m.w * width;
        const mh = m.h * horizonY;
        ctx.fillRect(mx, horizonY - mh, mw, mh);
        // Monolith neon beacon on roof
        ctx.fillStyle = '#4cd7f6';
        ctx.fillRect(mx + mw * 0.45, horizonY - mh - 4, 3, 4);
        ctx.fillStyle = 'rgba(6, 25, 48, 0.7)';
      }

      // Synthwave Glowing Sun on Horizon
      const sunGrad = ctx.createRadialGradient(width / 2, horizonY, 10, width / 2, horizonY, 160);
      sunGrad.addColorStop(0, isOverdrive ? 'rgba(251, 171, 255, 0.6)' : 'rgba(76, 215, 246, 0.45)');
      sunGrad.addColorStop(0.5, 'rgba(174, 5, 198, 0.2)');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width / 2, horizonY, 160, Math.PI, 0);
      ctx.fill();
    } else {
      // Magma Vault: Volcanic glow & heat vents
      const magmaGrad = ctx.createRadialGradient(width / 2, horizonY, 15, width / 2, horizonY, 180);
      magmaGrad.addColorStop(0, 'rgba(255, 100, 20, 0.5)');
      magmaGrad.addColorStop(0.6, 'rgba(160, 20, 0, 0.25)');
      magmaGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = magmaGrad;
      ctx.beginPath();
      ctx.arc(width / 2, horizonY, 180, Math.PI, 0);
      ctx.fill();
    }

    // Horizon Bright Neon Laser Line
    const laserGrad = ctx.createLinearGradient(0, 0, width, 0);
    laserGrad.addColorStop(0, 'transparent');
    laserGrad.addColorStop(0.5, isOverdrive ? '#fbabff' : '#4cd7f6');
    laserGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = laserGrad;
    ctx.lineWidth = isOverdrive ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width, horizonY);
    ctx.stroke();
  }

  private renderTrack(playerZ: number, biome: 'neon_city' | 'sky_bridge' | 'magma_vault', isOverdrive: boolean) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;
    const horizonY = height * 0.42;

    // Track Surface Background
    ctx.fillStyle = biome === 'magma_vault' ? '#120505' : '#031020';
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Track Boundary Bounds: Left = -1.5, Right = 1.5
    const leftNear = this.project(-1.55, 0, 1.0);
    const leftFar = this.project(-1.55, 0, 160);
    const rightNear = this.project(1.55, 0, 1.0);
    const rightFar = this.project(1.55, 0, 160);

    // Highway Underglow
    const roadPolyGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    if (biome === 'magma_vault') {
      roadPolyGrad.addColorStop(0, 'rgba(40, 10, 10, 0.8)');
      roadPolyGrad.addColorStop(1, 'rgba(15, 2, 2, 0.95)');
    } else {
      roadPolyGrad.addColorStop(0, 'rgba(6, 25, 48, 0.85)');
      roadPolyGrad.addColorStop(1, isOverdrive ? 'rgba(50, 10, 60, 0.95)' : 'rgba(3, 16, 32, 0.95)');
    }

    ctx.fillStyle = roadPolyGrad;
    ctx.beginPath();
    ctx.moveTo(leftNear.x, leftNear.y);
    ctx.lineTo(leftFar.x, leftFar.y);
    ctx.lineTo(rightFar.x, rightFar.y);
    ctx.lineTo(rightNear.x, rightNear.y);
    ctx.closePath();
    ctx.fill();

    // Perspective Crossbars / Rung Scanlines
    const rungInterval = 6.0; // every 6 meters
    const firstRungZ = Math.floor(playerZ / rungInterval) * rungInterval;
    ctx.lineWidth = 1.5;

    for (let z = firstRungZ; z < playerZ + 140; z += rungInterval) {
      const zRel = z - playerZ;
      if (zRel <= 0.8) continue;

      const pL = this.project(-1.5, 0, zRel);
      const pR = this.project(1.5, 0, zRel);
      if (!pL.visible || !pR.visible) continue;

      const alpha = Math.min(1.0, (1 - zRel / 140) * 0.45);
      ctx.strokeStyle = isOverdrive
        ? `rgba(251, 171, 255, ${alpha * 1.3})`
        : biome === 'magma_vault'
        ? `rgba(255, 120, 40, ${alpha})`
        : `rgba(76, 215, 246, ${alpha})`;

      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.stroke();
    }

    // 3-Lane Divider Dashed Lines (-0.5 and +0.5)
    const laneDividers = [-0.5, 0.5];
    ctx.lineWidth = 2.0;
    for (const laneDiv of laneDividers) {
      const dNear = this.project(laneDiv, 0, 1.0);
      const dFar = this.project(laneDiv, 0, 150);

      ctx.save();
      ctx.strokeStyle = isOverdrive ? 'rgba(251, 171, 255, 0.55)' : 'rgba(76, 215, 246, 0.45)';
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(dNear.x, dNear.y);
      ctx.lineTo(dFar.x, dFar.y);
      ctx.stroke();
      ctx.restore();
    }

    // Outer Neon Highway Rails (-1.5 and +1.5)
    const railColor = isOverdrive ? '#fbabff' : biome === 'magma_vault' ? '#ff6030' : '#4cd7f6';
    ctx.shadowBlur = 12;
    ctx.shadowColor = railColor;
    ctx.strokeStyle = railColor;
    ctx.lineWidth = 3.5;

    // Left Rail
    ctx.beginPath();
    ctx.moveTo(leftNear.x, leftNear.y);
    ctx.lineTo(leftFar.x, leftFar.y);
    ctx.stroke();

    // Right Rail
    ctx.beginPath();
    ctx.moveTo(rightNear.x, rightNear.y);
    ctx.lineTo(rightFar.x, rightFar.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private renderEntities(chunks: TrackChunk[], playerZ: number, biome: 'neon_city' | 'sky_bridge' | 'magma_vault') {
    const ctx = this.ctx;

    // Collect all visible entities sorted from furthest to closest (painter's algorithm)
    type Renderable = { type: 'obstacle'; entity: ObstacleEntity; zRel: number } | { type: 'collectible'; entity: CollectibleEntity; zRel: number };
    const renderQueue: Renderable[] = [];

    for (const chunk of chunks) {
      for (const obs of chunk.obstacles) {
        const zRel = obs.zPos - playerZ;
        if (zRel > -4 && zRel < 150) {
          renderQueue.push({ type: 'obstacle', entity: obs, zRel });
        }
      }
      for (const col of chunk.collectibles) {
        if (col.collected) continue;
        const zRel = col.zPos - playerZ;
        if (zRel > -2 && zRel < 150) {
          renderQueue.push({ type: 'collectible', entity: col, zRel });
        }
      }
    }

    renderQueue.sort((a, b) => b.zRel - a.zRel);

    for (const item of renderQueue) {
      if (item.type === 'obstacle') {
        this.drawObstacle(item.entity, item.zRel, biome);
      } else {
        this.drawCollectible(item.entity, item.zRel);
      }
    }
  }

  private drawObstacle(obs: ObstacleEntity, zRel: number, biome: string) {
    if (zRel <= 0.8) return;
    const ctx = this.ctx;
    const laneX = LANE_X_POSITIONS[obs.lane];
    const proj = this.project(laneX, 0, zRel);
    if (!proj.visible) return;

    const baseWidth = 140 * proj.scale;

    if (obs.type === 'barrier_low') {
      // Low laser hurdle: Ground barrier requiring JUMP
      const barHeight = 36 * proj.scale;
      const leftCol = this.project(laneX - 0.45, 0, zRel);
      const rightCol = this.project(laneX + 0.45, 0, zRel);

      // Warning neon glow
      ctx.shadowBlur = 16 * proj.scale;
      ctx.shadowColor = '#ff5449';

      // Pylons
      ctx.fillStyle = '#93000a';
      ctx.fillRect(leftCol.x - 6 * proj.scale, leftCol.y - barHeight, 12 * proj.scale, barHeight);
      ctx.fillRect(rightCol.x - 6 * proj.scale, rightCol.y - barHeight, 12 * proj.scale, barHeight);

      // Red laser beam
      ctx.fillStyle = '#ff5449';
      ctx.fillRect(leftCol.x, leftCol.y - barHeight * 0.7, rightCol.x - leftCol.x, 8 * proj.scale);

      // Label: JUMP
      if (proj.scale > 0.45) {
        ctx.font = `bold ${Math.floor(10 * proj.scale)}px "JetBrains Mono"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('▲ JUMP ▲', (leftCol.x + rightCol.x) / 2, leftCol.y - barHeight - 4);
      }
      ctx.shadowBlur = 0;
    } else if (obs.type === 'barrier_high') {
      // High laser barrier: Suspended overhead clearance requiring SLIDE
      const clearanceY = 28 * proj.scale; // Open gap underneath
      const barTop = 75 * proj.scale;
      const leftCol = this.project(laneX - 0.45, 0, zRel);
      const rightCol = this.project(laneX + 0.45, 0, zRel);

      ctx.shadowBlur = 18 * proj.scale;
      ctx.shadowColor = '#f7be1d';

      // Amber Overhead Housing
      ctx.fillStyle = 'rgba(209, 159, 0, 0.85)';
      ctx.fillRect(leftCol.x, leftCol.y - barTop, rightCol.x - leftCol.x, barTop - clearanceY);

      // Overhead hazard stripes
      ctx.strokeStyle = '#251a00';
      ctx.lineWidth = 2 * proj.scale;
      ctx.strokeRect(leftCol.x, leftCol.y - barTop, rightCol.x - leftCol.x, barTop - clearanceY);

      // Label: SLIDE
      if (proj.scale > 0.4) {
        ctx.font = `bold ${Math.floor(11 * proj.scale)}px "JetBrains Mono"`;
        ctx.fillStyle = '#ffdf9a';
        ctx.textAlign = 'center';
        ctx.fillText('▼ DUCK SLIDE ▼', (leftCol.x + rightCol.x) / 2, leftCol.y - clearanceY - 6 * proj.scale);
      }
      ctx.shadowBlur = 0;
    } else if (obs.type === 'pitfall') {
      // Void pitfall hole in track
      const pLeft = this.project(laneX - 0.48, 0, zRel);
      const pRight = this.project(laneX + 0.48, 0, zRel);
      const pitDepth = 22 * proj.scale;

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse((pLeft.x + pRight.x) / 2, pLeft.y, (pRight.x - pLeft.x) / 2, pitDepth, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#4cd7f6';
      ctx.lineWidth = 2 * proj.scale;
      ctx.stroke();
    } else if (obs.type === 'moving_train') {
      // Rapid cyber drone / train
      const trainH = 75 * proj.scale;
      const trainW = 90 * proj.scale;
      ctx.shadowBlur = 20 * proj.scale;
      ctx.shadowColor = '#ff2050';

      ctx.fillStyle = '#260a14';
      ctx.fillRect(proj.x - trainW / 2, proj.y - trainH, trainW, trainH);

      // Dual headlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(proj.x - trainW * 0.28, proj.y - trainH * 0.4, 6 * proj.scale, 0, Math.PI * 2);
      ctx.arc(proj.x + trainW * 0.28, proj.y - trainH * 0.4, 6 * proj.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawCollectible(col: CollectibleEntity, zRel: number) {
    if (zRel <= 0.8) return;
    const ctx = this.ctx;
    const laneX = LANE_X_POSITIONS[col.lane];
    const proj = this.project(laneX, col.yOffset, zRel);
    if (!proj.visible) return;

    const size = (col.type === 'coin' ? 24 : 32) * proj.scale;

    if (col.type === 'coin') {
      // Rotating Golden Ring
      ctx.shadowBlur = 14 * proj.scale;
      ctx.shadowColor = '#f7be1d';

      ctx.strokeStyle = '#f7be1d';
      ctx.lineWidth = 3.5 * proj.scale;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, size * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffdf9a';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Power-up capsule
      let color = '#4cd7f6';
      let icon = '⚡';
      if (col.type === 'shield') {
        color = '#ae05c6';
        icon = '🛡';
      } else if (col.type === 'coin_magnet') {
        color = '#f7be1d';
        icon = '🧲';
      } else if (col.type === 'multiplier_2x') {
        color = '#4cd7f6';
        icon = '2X';
      } else {
        color = '#fbabff';
        icon = '🚀';
      }

      ctx.shadowBlur = 20 * proj.scale;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, size * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000f21';
      ctx.font = `bold ${Math.floor(12 * proj.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, proj.x, proj.y);
      ctx.shadowBlur = 0;
    }
  }

  private renderGhost(playerZ: number, ghostZ: number, ghostLane: LaneIndex) {
    const zRel = ghostZ - playerZ;
    if (zRel < -15 || zRel > 140) return;

    const ctx = this.ctx;
    const laneX = LANE_X_POSITIONS[ghostLane];
    const proj = this.project(laneX, 0, Math.max(1.0, zRel));
    if (!proj.visible) return;

    const scale = proj.scale;
    const width = 110 * scale;
    const height = 45 * scale;

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.shadowBlur = 20 * scale;
    ctx.shadowColor = '#4cd7f6';

    // Ghost Hologram wireframe
    ctx.strokeStyle = '#4cd7f6';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(proj.x - width / 2, proj.y - height, width, height);

    // Ghost Tag
    ctx.font = `bold ${Math.max(9, Math.floor(12 * scale))}px "JetBrains Mono"`;
    ctx.fillStyle = '#4cd7f6';
    ctx.textAlign = 'center';
    ctx.fillText('GHOST // PB', proj.x, proj.y - height - 8 * scale);

    ctx.restore();
  }

  private renderPlayer(player: PlayerPhysicsState, isOverdrive: boolean, biome: string) {
    const ctx = this.ctx;
    // Player is situated near the bottom (zRel approx 3.0 in projection)
    const playerProj = this.project(player.currentX, player.yPos, 2.8);
    const px = playerProj.x;
    const py = playerProj.y;

    const isSliding = player.isSliding;
    const scale = 1.0;
    const craftWidth = (isSliding ? 140 : 170) * scale;
    const craftHeight = (isSliding ? 34 : 72) * scale;

    ctx.save();

    // 1. Ground Plasma Shadow / Underglow
    const shadowProj = this.project(player.currentX, 0, 2.8);
    const shadowWidth = craftWidth * (1.0 - player.yPos * 0.015);
    const shadowAlpha = Math.max(0.2, 0.8 - player.yPos * 0.02);

    const groundGlow = ctx.createRadialGradient(
      shadowProj.x,
      shadowProj.y,
      4,
      shadowProj.x,
      shadowProj.y,
      shadowWidth * 0.65
    );
    groundGlow.addColorStop(0, isOverdrive ? `rgba(251, 171, 255, ${shadowAlpha})` : `rgba(76, 215, 246, ${shadowAlpha})`);
    groundGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(shadowProj.x, shadowProj.y, shadowWidth * 0.5, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Overdrive / Invincibility Aura
    if (isOverdrive || player.invincibleTimerMs > 0) {
      ctx.shadowBlur = 35;
      ctx.shadowColor = isOverdrive ? '#fbabff' : '#4cd7f6';
      ctx.strokeStyle = isOverdrive ? '#fbabff' : '#4cd7f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, py - craftHeight * 0.5, craftWidth * 0.65, craftHeight * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Futuristic Hovercraft Body
    ctx.shadowBlur = isOverdrive ? 28 : 16;
    ctx.shadowColor = isOverdrive ? '#fbabff' : '#4cd7f6';

    // Hull Gradient
    const hullGrad = ctx.createLinearGradient(px - craftWidth / 2, py - craftHeight, px + craftWidth / 2, py);
    hullGrad.addColorStop(0, '#102034');
    hullGrad.addColorStop(0.5, '#1b2b3f');
    hullGrad.addColorStop(1, '#0b1c30');
    ctx.fillStyle = hullGrad;

    // Aerodynamic Hull Path
    ctx.beginPath();
    ctx.moveTo(px - craftWidth * 0.5, py - craftHeight * 0.35); // Left wingtip
    ctx.lineTo(px - craftWidth * 0.25, py - craftHeight); // Left canopy shoulder
    ctx.lineTo(px + craftWidth * 0.25, py - craftHeight); // Right canopy shoulder
    ctx.lineTo(px + craftWidth * 0.5, py - craftHeight * 0.35); // Right wingtip
    ctx.lineTo(px + craftWidth * 0.35, py); // Right rear thruster
    ctx.lineTo(px - craftWidth * 0.35, py); // Left rear thruster
    ctx.closePath();
    ctx.fill();

    // Hull Border Edge
    ctx.strokeStyle = isOverdrive ? '#fbabff' : '#4cd7f6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Cockpit Glass Canopy
    const cockpitGrad = ctx.createLinearGradient(px, py - craftHeight, px, py - craftHeight * 0.4);
    cockpitGrad.addColorStop(0, '#acedff');
    cockpitGrad.addColorStop(0.5, '#06b6d4');
    cockpitGrad.addColorStop(1, '#031427');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.ellipse(px, py - craftHeight * 0.65, craftWidth * 0.18, craftHeight * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Dual Neon Thrusters Flames
    const thrusterColor = isOverdrive ? '#fbabff' : '#4cd7f6';
    const flameLength = isOverdrive ? 48 : 26;

    ctx.fillStyle = thrusterColor;
    // Left thruster flame
    ctx.beginPath();
    ctx.moveTo(px - craftWidth * 0.28, py);
    ctx.lineTo(px - craftWidth * 0.22, py);
    ctx.lineTo(px - craftWidth * 0.25, py + flameLength);
    ctx.closePath();
    ctx.fill();

    // Right thruster flame
    ctx.beginPath();
    ctx.moveTo(px + craftWidth * 0.22, py);
    ctx.lineTo(px + craftWidth * 0.28, py);
    ctx.lineTo(px + craftWidth * 0.25, py + flameLength);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderSparksAndSpeedLines(dt: number, isOverdrive: boolean) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Overdrive Speed Streaks
    if (isOverdrive) {
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        const sx = Math.random() * width;
        const sy = Math.random() * height * 0.8 + height * 0.2;
        const len = Math.random() * 80 + 40;
        ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(251, 171, 255, 0.4)' : 'rgba(76, 215, 246, 0.4)';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + len);
        ctx.stroke();
      }
    }

    // Dynamic Near-Miss and Coin Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;

      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.min(1.0, s.life * 3);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
