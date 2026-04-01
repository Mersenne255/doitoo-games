import { BoardLayout } from '../models/game.models';

export function serializeLayout(layout: BoardLayout): string {
  return JSON.stringify(layout);
}

export function deserializeLayout(json: string): BoardLayout | Error {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return new Error('Invalid JSON string');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return new Error('Layout must be a non-null object');
  }

  const obj = parsed as Record<string, unknown>;
  const requiredArrays = ['spawnPoints', 'junctions', 'stations', 'paths'] as const;

  for (const field of requiredArrays) {
    if (!Array.isArray(obj[field])) {
      return new Error(`Missing or invalid required field: ${field}`);
    }
  }

  return obj as unknown as BoardLayout;
}
