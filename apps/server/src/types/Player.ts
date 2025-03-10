export type Player = {
    id : string;
    x: number;
    y: number;
    size: number;
    velocity: { x: number; y: number };
    lastProcessedInput: number;
    animationState?: { direction: string; moving: boolean };
};