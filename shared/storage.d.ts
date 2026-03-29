/**
 * TypeScript type declarations for shared/storage.js
 */

export interface GameStorage {
  get<T = unknown>(key: string, fallback?: T): T;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  keys(): string[];
  clear(): void;
}

export declare function createGameStorage(gameId: string): GameStorage;
