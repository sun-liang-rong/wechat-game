import { describe, expect, it } from 'vitest';

import { GestureRecognizer } from '../../src/game/input/GestureRecognizer';

describe('GestureRecognizer', () => {
  it('recognizes a short movement as a tap', () => {
    const recognizer = new GestureRecognizer();

    recognizer.start(100, 100, 0);

    expect(recognizer.end(104, 102, 180)).toEqual({
      kind: 'tap',
      point: { x: 104, y: 102 },
    });
  });

  it('recognizes a long open movement as a drag', () => {
    const recognizer = new GestureRecognizer();

    recognizer.start(20, 100, 0);
    recognizer.move(130, 100);

    expect(recognizer.end(160, 100, 300)).toEqual({
      kind: 'drag',
      start: { x: 20, y: 100 },
      end: { x: 160, y: 100 },
      delta: { x: 140, y: 0 },
    });
  });

  it('recognizes a closed path with enough travel as a loop', () => {
    const recognizer = new GestureRecognizer();

    recognizer.start(100, 100, 0);
    recognizer.move(140, 90);
    recognizer.move(155, 130);
    recognizer.move(125, 155);
    recognizer.move(92, 130);
    recognizer.move(104, 103);

    expect(recognizer.end(104, 103, 700)).toEqual({
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

    recognizer.start(0, 0, 0);
    recognizer.move(200, 0);
    recognizer.cancel();

    recognizer.start(50, 50, 100);

    expect(recognizer.end(52, 51, 200)).toEqual({
      kind: 'tap',
      point: { x: 52, y: 51 },
    });
  });
});
