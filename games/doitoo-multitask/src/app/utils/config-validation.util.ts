import { MathEquationsConfig, MathOperator, ProgressionSpeed } from '../models/game.models';

const VALID_OPS: MathOperator[] = ['+', '−', '×', '/'];
const VALID_SPEEDS: ProgressionSpeed[] = ['slow', 'medium', 'fast'];

export function validateMathConfig(config: Partial<MathEquationsConfig>): MathEquationsConfig {
  const ops = (config.allowedOperators ?? []).filter(o => VALID_OPS.includes(o));
  return {
    allowedOperators: ops.length > 0 ? ops : ['+'],
  };
}

export function validateProgressionSpeed(speed: string): ProgressionSpeed {
  return VALID_SPEEDS.includes(speed as ProgressionSpeed) ? speed as ProgressionSpeed : 'medium';
}

export function validateSlotCount(count: number): number {
  return Math.min(Math.max(Math.round(count), 2), 3);
}
