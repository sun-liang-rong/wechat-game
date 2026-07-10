export const DESIGN_WIDTH = 375;
export const DESIGN_HEIGHT = 667;

export interface Point {
  x: number;
  y: number;
}

export type Gesture =
  | { kind: 'tap'; point: Point }
  | { kind: 'drag'; start: Point; end: Point; delta: Point }
  | { kind: 'loop'; points: Point[] };

export type Grade = 'S' | 'A' | 'B';

export interface GameResult {
  grade: Grade;
  misses: number;
  lateMinutes: 5;
  deduction: 300 | 200 | 100;
  message: string;
}
