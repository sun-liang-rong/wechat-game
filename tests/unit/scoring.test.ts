import { describe, expect, it } from 'vitest';

import { createResult } from '../../src/game/scoring';

describe('createResult', () => {
  it.each([
    {
      misses: 0,
      grade: 'S',
      deduction: 300,
      message: '完美封印，全勤奖彻底消失。',
    },
    {
      misses: 2,
      grade: 'S',
      deduction: 300,
      message: '完美封印，全勤奖彻底消失。',
    },
    {
      misses: 3,
      grade: 'A',
      deduction: 200,
      message: '世界获救，但他差点醒了。',
    },
    {
      misses: 6,
      grade: 'A',
      deduction: 200,
      message: '世界获救，但他差点醒了。',
    },
    {
      misses: 7,
      grade: 'B',
      deduction: 100,
      message: '勉强多睡五分钟，扣款照常发生。',
    },
  ])(
    'returns grade $grade for $misses misses',
    ({ misses, grade, deduction, message }) => {
      expect(createResult(misses)).toEqual({
        grade,
        misses,
        lateMinutes: 5,
        deduction,
        message,
      });
    },
  );
});
