import { LaneIndex, PlayerPhysicsState } from './types';
import {
  LANE_X_POSITIONS,
  LERP_LANE_SPEED,
  GRAVITY,
  JUMP_VELOCITY,
  SLIDE_DURATION_MS,
  JUMP_BUFFER_MS,
  COYOTE_TIME_MS,
} from './constants';

/** Lanes, jump (with buffer and coyote time) and slide. Collision lives in collision.ts. */
export class KinematicController {
  public player: PlayerPhysicsState = KinematicController.initialPlayer();
  public jumpBufferTimerMs = 0;
  public coyoteTimerMs = 0;

  private static initialPlayer(): PlayerPhysicsState {
    return {
      lane: 1,
      targetX: LANE_X_POSITIONS[1],
      currentX: LANE_X_POSITIONS[1],
      yPos: 0,
      yVelocity: 0,
      isGrounded: true,
      isJumping: false,
      isSliding: false,
      slideTimerMs: 0,
      invincibleTimerMs: 0,
    };
  }

  public shiftLane(direction: -1 | 1): boolean {
    const nextLane = Math.max(0, Math.min(2, this.player.lane + direction)) as LaneIndex;
    if (nextLane === this.player.lane) return false;
    this.player.lane = nextLane;
    this.player.targetX = LANE_X_POSITIONS[nextLane];
    return true;
  }

  public requestJump() {
    this.jumpBufferTimerMs = JUMP_BUFFER_MS;
  }

  public requestSlide() {
    this.player.isSliding = true;
    this.player.slideTimerMs = SLIDE_DURATION_MS;
    // Fast fall if sliding mid-air
    if (!this.player.isGrounded) {
      this.player.yVelocity = -JUMP_VELOCITY;
    }
  }

  public update(dt: number) {
    const dtMs = dt * 1000;
    const p = this.player;

    p.currentX += (p.targetX - p.currentX) * Math.min(1.0, dt * LERP_LANE_SPEED);

    if (p.isSliding) {
      p.slideTimerMs -= dtMs;
      if (p.slideTimerMs <= 0) {
        p.isSliding = false;
        p.slideTimerMs = 0;
      }
    }

    if (p.invincibleTimerMs > 0) {
      p.invincibleTimerMs -= dtMs;
    }

    this.coyoteTimerMs = p.isGrounded ? COYOTE_TIME_MS : Math.max(0, this.coyoteTimerMs - dtMs);

    if (this.jumpBufferTimerMs > 0) {
      this.jumpBufferTimerMs -= dtMs;
      if (p.isGrounded || this.coyoteTimerMs > 0) {
        p.yVelocity = JUMP_VELOCITY;
        p.isGrounded = false;
        p.isJumping = true;
        p.isSliding = false;
        this.jumpBufferTimerMs = 0;
        this.coyoteTimerMs = 0;
      }
    }

    if (!p.isGrounded) {
      p.yPos += p.yVelocity * dt;
      p.yVelocity -= GRAVITY * dt;
      if (p.yPos <= 0) {
        p.yPos = 0;
        p.yVelocity = 0;
        p.isGrounded = true;
        p.isJumping = false;
      }
    }
  }
}
