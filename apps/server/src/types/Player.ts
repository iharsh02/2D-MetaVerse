export interface Player {
    x: number;
    y: number;
    size: number;
    animationState?: {
        direction: string;
        moving: boolean;
    };
}