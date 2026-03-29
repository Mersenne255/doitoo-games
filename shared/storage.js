/**
 * shared/storage.js — Namespaced localStorage utility for Doitoo Games platform.
 *
 * Each game should use this instead of raw localStorage to avoid key collisions.
 * Keys are automatically prefixed with the game ID: "gameId:key"
 *
 * Usage (vanilla JS):
 *   import { createGameStorage } from '/shared/storage.js';
 *   const storage = createGameStorage('doitoo-numbers');
 *   storage.set('configs', { ... });
 *   const configs = storage.get('configs');
 *
 * Usage (Angular/TS — copy or import the pattern):
 *   See shared/storage.d.ts for TypeScript types.
 */

/**
 * Creates a namespaced storage interface for a specific game.
 * @param {string} gameId - The game's unique ID (must match registry entry)
 * @returns {{ get, set, remove, keys }}
 */
export function createGameStorage(gameId) {
  if (!gameId || typeof gameId !== 'string') {
    throw new Error('createGameStorage requires a non-empty gameId string');
  }

  const prefix = gameId + ':';

  return {
    /**
     * Get a parsed value from localStorage.
     * @param {string} key
     * @param {*} [fallback=null] - Returned if key is missing or parse fails
     * @returns {*}
     */
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(prefix + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    /**
     * Set a JSON-serializable value in localStorage.
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
      } catch {
        // quota exceeded — silently fail
      }
    },

    /**
     * Remove a key from localStorage.
     * @param {string} key
     */
    remove(key) {
      localStorage.removeItem(prefix + key);
    },

    /**
     * Get all keys belonging to this game (without the prefix).
     * @returns {string[]}
     */
    keys() {
      const result = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          result.push(k.slice(prefix.length));
        }
      }
      return result;
    },

    /**
     * Clear all keys belonging to this game.
     */
    clear() {
      this.keys().forEach((k) => this.remove(k));
    }
  };
}
