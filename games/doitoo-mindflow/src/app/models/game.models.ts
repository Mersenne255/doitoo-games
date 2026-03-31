// ── game.models.ts ──

export type GameStage = 'idle' | 'countdown' | 'playing' | 'summary';

export type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon';

export const SHAPE_TYPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];

export type BaseSpeed = 'slow' | 'medium' | 'fast';

export const BASE_SPEED_VALUES: Record<BaseSpeed, number> = {
  slow: 80,    // pixels per second
  medium: 150,
  fast: 250,
};

export const COLOR_PALETTE: string[] = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
  '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#f5f5f5',
];

/** A station identity: unique (shapeType, color) pair */
export interface StationIdentity {
  shapeType: ShapeType;
  color: string;
}

/** Game configuration */
export interface MindFlowConfig {
  trainCount: number;       // 2–20, default 4
  shapeCount: number;       // 5–100, default 20
  baseSpeed: BaseSpeed;     // default 'medium'
  spawnInterval: number;    // 1–10 seconds, default 3
}

export const DEFAULT_CONFIG: MindFlowConfig = {
  trainCount: 4,
  shapeCount: 20,
  baseSpeed: 'medium',
  spawnInterval: 3,
};

/** A 2D point on the canvas */
export interface Point {
  x: number;
  y: number;
}

/** A path segment connecting two nodes */
export interface PathSegment {
  id: string;
  from: string;  // node ID (spawn point, junction, or station)
  to: string;    // node ID
  waypoints: Point[];  // ordered points defining the path curve
  length: number;      // total pixel length of the path
}

/** A junction node where paths branch */
export interface Junction {
  id: string;
  position: Point;
  outgoingPathIds: string[];  // IDs of outgoing PathSegments
  switchIndex: number;        // current switch state (index into outgoingPathIds)
}

/** A spawn point node */
export interface SpawnPoint {
  id: string;
  position: Point;
  outgoingPathId: string;  // path leading to first junction
}

/** A station node */
export interface Station {
  id: string;
  position: Point;
  identity: StationIdentity;
}

/** The complete board layout */
export interface BoardLayout {
  spawnPoints: SpawnPoint[];
  junctions: Junction[];
  stations: Station[];
  paths: PathSegment[];
}

/** A shape currently moving on the board */
export interface ActiveShape {
  id: string;
  identity: StationIdentity;       // what this shape looks like / where it should go
  currentPathId: string;            // which path segment it's on
  progressAlongPath: number;        // 0.0 to 1.0 along current path
  spawnTime: number;                // timestamp when spawned (for speed bonus calc)
}

/** Result of a single delivery */
export interface DeliveryResult {
  shapeId: string;
  stationId: string;
  correct: boolean;
  timestamp: number;
}

/** Round statistics for the summary */
export interface RoundResult {
  score: number;
  correctDeliveries: number;
  misdeliveries: number;
  accuracy: number;           // percentage 0–100
  elapsedTimeMs: number;
  longestStreak: number;
  trainCount: number;
  shapeCount: number;
}

/** Scoring state tracked during a round */
export interface ScoringState {
  score: number;
  streak: number;
  longestStreak: number;
  correctDeliveries: number;
  misdeliveries: number;
}
