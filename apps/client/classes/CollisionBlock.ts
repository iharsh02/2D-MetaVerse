interface CollisionBlockOptions {
  x: number;
  y: number;
  size: number;
}

export class CollisionBlock {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor({ x, y, size }: CollisionBlockOptions) {
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;
  }

  draw(c: CanvasRenderingContext2D): void {
    // Optional: Draw collision blocks for debugging
    c.fillStyle = "rgba(255, 0, 0, 0.5)";
    c.fillRect(this.x, this.y, this.width, this.height);
  }
}
