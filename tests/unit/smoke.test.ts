import { describe, expect, it } from 'vitest';

import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../src/game/types';

describe('game design dimensions', () => {
  it('uses a 375 by 667 portrait canvas', () => {
    expect(DESIGN_WIDTH).toBe(375);
    expect(DESIGN_HEIGHT).toBe(667);
  });
});
