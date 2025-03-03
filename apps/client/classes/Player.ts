import { Socket } from "socket.io-client";

const X_VELOCITY = 120;
const Y_VELOCITY = 120;

interface Vector {
  x: number;
  y: number;
}

interface PlayerOptions {
  x: number;
  y: number;
  size: number;
  velocity?: Vector;
}

interface CollisionBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  frameCount?: number;
}

interface KeyState {
  pressed: boolean;
}

export interface Keys {
  w: KeyState;
  a: KeyState;
  s: KeyState;
  d: KeyState;
}

export class Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocity: Vector;
  center: Vector;
  image: HTMLImageElement;
  loaded: boolean;
  currentFrame: number;
  elapsedTime: number;
  sprites: {
    walkDown: CollisionBlock;
    walkUp: CollisionBlock;
    walkLeft: CollisionBlock;
    walkRight: CollisionBlock;
  };
  currentSprite: CollisionBlock;
  socket?: Socket;

  constructor({ x, y, size, velocity = { x: 0, y: 0 } }: PlayerOptions) {
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;
    this.velocity = velocity;
    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
    this.loaded = false;
    this.image = new Image();
    this.image.onload = () => {
      this.loaded = true;
    };
    this.image.src = "images/player.png";
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.sprites = {
      walkDown: {
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
      walkUp: {
        x: 16,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
      walkLeft: {
        x: 32,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
      walkRight: {
        x: 48,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
    };
    this.currentSprite = this.sprites.walkDown;
  }

  draw(c: CanvasRenderingContext2D): void {
    if (!this.loaded) return;

    // Optional: Draw player collision block for debugging
    // c.fillStyle = "rgba(0, 0, 255, 0.5)";
    // c.fillRect(this.x, this.y, this.width, this.height);

    c.drawImage(
      this.image,
      this.currentSprite.x,
      this.currentSprite.height * this.currentFrame + 0.5,
      this.currentSprite.width,
      this.currentSprite.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
  }

  update(keys: Keys, deltaTime: number, collisionBlocks: CollisionBlock[]): void {
    if (!deltaTime) return;

    this.elapsedTime += deltaTime;

    const intervalToGoToNextFrame = 0.15;

    if (this.elapsedTime > intervalToGoToNextFrame) {
      this.currentFrame =
        (this.currentFrame + 1) % (this.currentSprite.frameCount ?? 1);
      this.elapsedTime -= intervalToGoToNextFrame;
    }
    
    // Update horizontal position and check collisions
    this.updateHorizontalPosition(deltaTime);
    this.checkForHorizontalCollisions(collisionBlocks);

    // Update vertical position and check collisions
    this.updateVerticalPosition(deltaTime);
    this.checkForVerticalCollisions(collisionBlocks);

    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };

    // Send position update to server
    if (this.socket) {
      this.socket.emit("playerMovement", {
        x: this.x,
        y: this.y,
        animationState: {
          direction: this.getCurrentSpriteDirection(),
          moving: this.isMoving()
        }
      });
    }
  }

  private updateHorizontalPosition(deltaTime: number): void {
    this.x += this.velocity.x * deltaTime;
  }

  private updateVerticalPosition(deltaTime: number): void {
    this.y += this.velocity.y * deltaTime;
  }

  handleInput(keys: Keys): void {
    // Store previous velocity for change detection
    const previousVelocity = { x: this.velocity.x, y: this.velocity.y };
    
    this.velocity.x = 0;
    this.velocity.y = 0;

    if (keys.d.pressed) {
      this.velocity.x = X_VELOCITY;
      this.currentSprite = this.sprites.walkRight;
      this.currentSprite.frameCount = 4;
    } else if (keys.a.pressed) {
      this.velocity.x = -X_VELOCITY;
      this.currentSprite = this.sprites.walkLeft;
      this.currentSprite.frameCount = 4;
    } else if (keys.w.pressed) {
      this.velocity.y = -Y_VELOCITY;
      this.currentSprite = this.sprites.walkUp;
      this.currentSprite.frameCount = 4;
    } else if (keys.s.pressed) {
      this.velocity.y = Y_VELOCITY;
      this.currentSprite = this.sprites.walkDown;
      this.currentSprite.frameCount = 4;
    } else {
      this.currentSprite.frameCount = 1;
    }

    // Emit player input state to server if we have a socket and velocity changed
    if (this.socket && (previousVelocity.x !== this.velocity.x || previousVelocity.y !== this.velocity.y)) {
      this.socket.emit("playerInput", {
        keys: {
          w: keys.w.pressed,
          a: keys.a.pressed,
          s: keys.s.pressed,
          d: keys.d.pressed
        }
      });
    }
  }

  private checkForHorizontalCollisions(
    collisionBlocks: CollisionBlock[]
  ): void {
    const buffer = 0.0001;
    for (const collisionBlock of collisionBlocks) {
      if (
        this.x <= collisionBlock.x + collisionBlock.width &&
        this.x + this.width >= collisionBlock.x &&
        this.y + this.height >= collisionBlock.y &&
        this.y <= collisionBlock.y + collisionBlock.height
      ) {
        if (this.velocity.x < 0) {
          this.x = collisionBlock.x + collisionBlock.width + buffer;
          break;
        }

        if (this.velocity.x > 0) {
          this.x = collisionBlock.x - this.width - buffer;
          break;
        }
      }
    }
  }

  private checkForVerticalCollisions(collisionBlocks: CollisionBlock[]): void {
    const buffer = 0.0001;
    for (const collisionBlock of collisionBlocks) {
      if (
        this.x <= collisionBlock.x + collisionBlock.width &&
        this.x + this.width >= collisionBlock.x &&
        this.y + this.height >= collisionBlock.y &&
        this.y <= collisionBlock.y + collisionBlock.height
      ) {
        if (this.velocity.y < 0) {
          this.velocity.y = 0;
          this.y = collisionBlock.y + collisionBlock.height + buffer;
          break;
        }

        if (this.velocity.y > 0) {
          this.velocity.y = 0;
          this.y = collisionBlock.y - this.height - buffer;
          break;
        }
      }
    }
  }

  // Add a method to update only animation frames without position changes
  updateAnimationOnly(deltaTime: number): void {
    if (!deltaTime) return;

    this.elapsedTime += deltaTime;

    const intervalToGoToNextFrame = 0.15;

    if (this.elapsedTime > intervalToGoToNextFrame) {
      this.currentFrame =
        (this.currentFrame + 1) % (this.currentSprite.frameCount ?? 1);
      this.elapsedTime -= intervalToGoToNextFrame;
    }

    // Update center point
    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  setSocket(socket: Socket): void {
    this.socket = socket;
  }
  
  getCurrentSpriteDirection(): string {
    switch (this.currentSprite.x) {
      case 0:
        return 'down';
      case 16:
        return 'up';
      case 32:
        return 'left';
      case 48:
        return 'right';
      default:
        return 'down';
    }
  }
  
  isMoving(): boolean {
    return this.velocity.x !== 0 || this.velocity.y !== 0;
  }
  
  setAnimationState(direction: string, moving: boolean): void {
    // Set the current sprite based on direction
    switch (direction) {
      case 'down':
        this.currentSprite = this.sprites.walkDown;
        break;
      case 'up':
        this.currentSprite = this.sprites.walkUp;
        break;
      case 'left':
        this.currentSprite = this.sprites.walkLeft;
        break;
      case 'right':
        this.currentSprite = this.sprites.walkRight;
        break;
    }
    
    // Update frame count based on movement
    this.currentSprite.frameCount = moving ? 4 : 1;
  }
}
