import { describe, expect, it } from 'vitest';

import { GestureRecognizer } from '../../src/game/input/GestureRecognizer';

describe('GestureRecognizer', () => {
  it('recognizes a short movement as a tap', () => {
    const recognizer = new GestureRecognizer();

    recognizer.start({ x: 100, y: 100 }, 0);

    expect(recognizer.end({ x: 104, y: 102 }, 180)).toEqual({
      kind: 'tap',
      point: { x: 104, y: 102 },
    });
  });

  it('recognizes a long open movement as a drag', () => {
    const recognizer = new GestureRecognizer();

    recognizer.start({ x: 20, y: 100 }, 0);
    recognizer.move({ x: 130, y: 100 });

    expect(recognizer.end({ x: 160, y: 100 }, 300)).toEqual({
      kind: 'drag',
      start: { x: 20, y: 100 },
      end: { x: 160, y: 100 },
      delta: { x: 140, y: 0 },
    });
  });

  it('recognizes a closed path with enough travel as a loop', () => {
    const recognizer = new GestureRecognizer();

    recognizer.start({ x: 100, y: 100 }, 0);
    recognizer.move({ x: 140, y: 90 });
    recognizer.move({ x: 155, y: 130 });
    recognizer.move({ x: 125, y: 155 });
    recognizer.move({ x: 92, y: 130 });
    recognizer.move({ x: 104, y: 103 });

    expect(recognizer.end({ x: 104, y: 103 }, 700)).toEqual({
      kind: 'loop',
      points: [
        { x: 100, y: 100 },
        { x: 140, y: 90 },
        { x: 155, y: 130 },
        { x: 125, y: 155 },
        { x: 92, y: 130 },
        { x: 104, y: 103 },
        { x: 104, y: 103 },
      ],
    });
  });

  it('does not mix a cancelled path into the next gesture', () => {
    const recognizer = new GestureRecognizer();

    recognizer.start({ x: 0, y: 0 }, 0);
    recognizer.move({ x: 200, y: 0 });
    recognizer.cancel();

    recognizer.start({ x: 50, y: 50 }, 100);

    expect(recognizer.end({ x: 52, y: 51 }, 200)).toEqual({
      kind: 'tap',
      point: { x: 52, y: 51 },
    });
  });
});
