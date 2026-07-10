import type { GameResult } from './types';

export function createResult(misses: number): GameResult {
  if (misses <= 2) {
    return {
      grade: 'S',
      misses,
      lateMinutes: 5,
      deduction: 300,
      message: '完美封印，全勤奖彻底消失。',
    };
  }

  if (misses <= 6) {
    return {
      grade: 'A',
      misses,
      lateMinutes: 5,
      deduction: 200,
      message: '世界获救，但他差点醒了。',
    };
  }

  return {
    grade: 'B',
    misses,
    lateMinutes: 5,
    deduction: 100,
    message: '勉强多睡五分钟，扣款照常发生。',
  };
}
