export const DESIGN_WIDTH = 375;
export const DESIGN_HEIGHT = 667;

export type Grade = 'S' | 'A' | 'B';

export interface GameResult {
  grade: Grade;
  misses: number;
  lateMinutes: 5;
  deduction: 300 | 200 | 100;
  message: string;
}
