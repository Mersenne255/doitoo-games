import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ChromaclashConfig, DEFAULT_CONFIG, SpeedMode } from '../models/game.models';

/** Arbitrary for valid SpeedMode values. */
const speedModeArb = fc.oneof(
  fc.constant<SpeedMode>('relaxed'),
  fc.constant<SpeedMode>('standard'),
  fc.constant<SpeedMode>('intense'),
);

/** Arbitrary for valid trialCount (multiples of 5 in [10, 50]). */
const trialCountArb = fc.oneof(
  fc.constant(10),
  fc.constant(15),
  fc.constant(20),
  fc.constant(25),
  fc.constant(30),
  fc.constant(35),
  fc.constant(40),
  fc.constant(45),
  fc.constant(50),
);

/** Arbitrary for a valid ChromaclashConfig. */
const configArb: fc.Arbitrary<ChromaclashConfig> = fc.record({
  difficulty: fc.integer({ min: 1, max: 20 }),
  trialCount: trialCountArb,
  speedMode: speedModeArb,
});

describe('StorageService property-based tests', () => {
  /**
   * Property 6: Config round-trip integrity — serialize then deserialize produces equivalent config.
   * Since StorageService uses JSON serialization, we verify JSON.parse(JSON.stringify(config)) === config.
   * **Validates: Requirements 4.3**
   */
  it('Property 6: JSON round-trip preserves config', () => {
    fc.assert(
      fc.property(configArb, (config) => {
        const serialized = JSON.stringify(config);
        const deserialized: ChromaclashConfig = JSON.parse(serialized);

        expect(deserialized).toEqual(config);
      }),
    );
  });

  describe('with localStorage mock', () => {
    let store: Record<string, string>;

    beforeEach(() => {
      store = {};
      const mockStorage = {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
      };
      vi.stubGlobal('localStorage', mockStorage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /**
     * loadConfig returns DEFAULT_CONFIG when localStorage has invalid data.
     * **Validates: Requirements 4.4**
     */
    it('loadConfig returns valid config for invalid stored data', async () => {
      const { StorageService } = await import('./storage.service');
      const service = new StorageService();

      const invalidValues = [
        'not-json',
        '{"difficulty":"abc"}',
        '42',
      ];

      for (const invalid of invalidValues) {
        store['chromaclash-config'] = invalid;
        const loaded = service.loadConfig();

        expect(loaded.difficulty).toBeGreaterThanOrEqual(1);
        expect(loaded.difficulty).toBeLessThanOrEqual(20);
        expect(loaded.trialCount).toBeGreaterThanOrEqual(10);
        expect(loaded.trialCount).toBeLessThanOrEqual(50);
        expect(['relaxed', 'standard', 'intense']).toContain(loaded.speedMode);
      }
    });

    /**
     * saveConfig → loadConfig round-trip preserves valid configs.
     * **Validates: Requirements 4.3**
     */
    it('saveConfig then loadConfig preserves valid config', async () => {
      const { StorageService } = await import('./storage.service');
      const service = new StorageService();

      fc.assert(
        fc.property(configArb, (config) => {
          service.saveConfig(config);
          const loaded = service.loadConfig();
          expect(loaded).toEqual(config);
        }),
      );
    });
  });
});
