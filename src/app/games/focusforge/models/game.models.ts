// ── game.models.ts ──

import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Shape Forms ──
export const SHAPE_FORMS = [
  'triangle', 'circle', 'square', 'diamond',
  'pentagon', 'hexagon', 'star', 'cross',
] as const;
export type ShapeForm = typeof SHAPE_FORMS[number];

// ── Shape Colors ──
export const SHAPE_COLORS = [
  'red', 'blue', 'green', 'yellow',
  'purple', 'orange', 'cyan', 'pink',
] as const;
export type ShapeColor = typeof SHAPE_COLORS[number];

export const SHAPE_COLOR_HEX: Record<ShapeColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  cyan: '#06b6d4',
  pink: '#ec4899',
};

// ── Search Types ──
export type SearchType = 'feature' | 'conjunction';

// ── Search Rule ──
export interface SearchRule {
  /** Short instruction text, ≤ 8 words (e.g., "Find the triangle") */
  instruction: string;
  /** The search type for this rule */
  searchType: SearchType;
  /** The feature dimension(s) that distinguish the target */
  targetFeature: {
    form?: ShapeForm;
    color?: ShapeColor;
    orientation?: number; // degrees
  };
}

// ── Visual Noise Level ──
export type VisualNoiseLevel = 'none' | 'size_variation' | 'size_rotation' | 'full';

// ── Distractor Similarity ──
export type DistractorSimilarity = 'low' | 'medium' | 'high' | 'maximum';

// ── Speed Mode ──
export type SpeedMode = 'relaxed' | 'standard' | 'intense';

export const SPEED_MODE_DELAYS: Record<SpeedMode, number> = {
  relaxed: 800,
  standard: 400,
  intense: 200,
};

// ── Difficulty Params ──
export interface DifficultyParams {
  fieldSize: number;                    // total shapes (target + distractors)
  responseWindowMs: number;             // max time to find target
  popOutRatio: number;                  // ratio of Feature_Search trials (0.0–1.0)
  distractorSimilarity: DistractorSimilarity;
  visualNoise: VisualNoiseLevel;
  ruleSwitchInterval: number;           // trials between rule switches (0 = no switches)
}

// ── Shape Instance (positioned in field) ──
export interface ShapeInstance {
  form: ShapeForm;
  color: ShapeColor;
  x: number;                            // position in field (0–1 normalized)
  y: number;                            // position in field (0–1 normalized)
  rotation: number;                     // degrees
  scale: number;                        // 1.0 = base size
  isTarget: boolean;
}

// ── Trial ──
export interface Trial {
  /** The search rule active for this trial */
  rule: SearchRule;
  /** All shapes in the search field (exactly one has isTarget=true) */
  shapes: ShapeInstance[];
  /** The search type for this trial */
  searchType: SearchType;
  /** Whether this trial starts a new rule block (triggers Rule_Switch animation) */
  isRuleSwitchTrial: boolean;
}

// ── Trial Result ──
export interface TrialResult {
  trial: Trial;
  /** Index of the shape the player tapped, or null if timed out */
  tappedShapeIndex: number | null;
  /** Whether the response was correct (tapped the target) */
  correct: boolean;
  /** Response time in ms, or null if timed out */
  responseTimeMs: number | null;
  /** The search type of this trial (for split metrics) */
  searchType: SearchType;
}

// ── Configuration ──
export interface FocusforgeConfig {
  difficulty: number;       // 1–20
  trialCount: number;       // 10–50, step 5
  speedMode: SpeedMode;
}

export const DEFAULT_CONFIG: FocusforgeConfig = {
  difficulty: 1,
  trialCount: 20,
  speedMode: 'standard',
};

// ── Scoring State (tracked during play) ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  totalResponseTimeMs: number;
  respondedCount: number;
  totalScore: number;
  // Split metrics by search type
  featureSearchTotalMs: number;
  featureSearchCount: number;
  conjunctionSearchTotalMs: number;
  conjunctionSearchCount: number;
}

// ── Round Result ──
export interface RoundResult {
  accuracy: number;                     // 0–100
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  averageResponseTimeMs: number;
  longestStreak: number;
  totalScore: number;
  difficulty: number;
  trialCount: number;
  speedMode: SpeedMode;
  averageFeatureSearchMs: number;       // avg response time for pop-out trials
  averageConjunctionSearchMs: number;   // avg response time for conjunction trials
}
