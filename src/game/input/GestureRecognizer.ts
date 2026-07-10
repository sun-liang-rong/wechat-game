import type { Gesture, Point } from '../types';

export class GestureRecognizer {
  private points: Point[] = [];
  private startedAt = 0;

  start(point: Point, startedAt: number): void {
    this.points = [{ ...point }];
    this.startedAt = startedAt;
  }

  move(point: Point): void {
    if (this.points.length === 0) {
      return;
    }

    this.points.push({ ...point });
  }

  end(point: Point, _endedAt: number): Gesture {
    const start = this.points[0];
    const end = { ...point };
    this.points.push(end);

    const travel = this.points.slice(1).reduce((total, point, index) => {
      return total + distance(this.points[index], point);
    }, 0);
    const displacement = distance(start, end);
    let gesture: Gesture;
    if (travel >= 120 && displacement <= 24 && this.points.length >= 5) {
      gesture = { kind: 'loop', points: [...this.points] };
    } else if (displacement >= 18) {
      gesture = {
        kind: 'drag',
        start,
        end,
        delta: { x: end.x - start.x, y: end.y - start.y },
      };
    } else {
      gesture = { kind: 'tap', point: end };
    }

    this.cancel();
    return gesture;
  }

  cancel(): void {
    this.points = [];
    this.startedAt = 0;
  }
}

function distance(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}
