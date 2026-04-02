import { DEFAULT_CONFIG, MindFlowConfig } from '../models/game.models';
import { validateConfig } from './config-validation.util';

export function serializeConfig(config: MindFlowConfig): string {
  return JSON.stringify(config);
}

export function deserializeConfig(json: string): MindFlowConfig {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_CONFIG };
    }
    return validateConfig(parsed);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
