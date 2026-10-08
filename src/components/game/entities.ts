// Spawnable entities: Ootybites products to collect, hill hazards to jump.

import { GROUND_Y } from "./physics";

// ─── Collectibles (the Ootybites range) ──────────────────────────────────────
export type CollectibleType = "tea" | "honey" | "chocolate" | "varki" | "spice";

export interface Collectible {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: CollectibleType;
  emoji: string;
  label: string;
  points: number;
  isBonus: boolean; // floats at jump height, worth more
}

interface CollectibleConfig {
  emoji: string;
  label: string;
  color: string;
}

export const COLLECTIBLE_CONFIG: Record<CollectibleType, CollectibleConfig> = {
  tea: { emoji: "🍃", label: "Nilgiri tea", color: "#22ab5f" },
  honey: { emoji: "🍯", label: "Wild honey", color: "#d98324" },
  chocolate: { emoji: "🍫", label: "Ooty chocolate", color: "#8a5f34" },
  varki: { emoji: "🍪", label: "Varki", color: "#e9a53c" },
  spice: { emoji: "🌿", label: "Hill spice", color: "#166b3d" },
};

const TYPES: CollectibleType[] = ["tea", "honey", "chocolate", "varki", "spice"];

const GROUND_POINTS = 10;
const BONUS_POINTS = 25;

let nextCollectibleId = 0;

export function createCollectible(spawnX: number): Collectible {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const cfg = COLLECTIBLE_CONFIG[type];

  // 55% float at jump height (a deliberate, rewarded jump), 45% sit at running
  // height (passive pickup). The float band 86–112 px sits inside a tap-jump's
  // ~97 px arc, so every bonus is reachable without a perfect held jump.
  const isBonus = Math.random() < 0.55;
  const y = isBonus ? GROUND_Y - 86 - Math.random() * 26 : GROUND_Y - 46;

  return {
    id: nextCollectibleId++,
    x: spawnX,
    y,
    width: 30,
    height: 30,
    type,
    emoji: cfg.emoji,
    label: cfg.label,
    points: isBonus ? BONUS_POINTS : GROUND_POINTS,
    isBonus,
  };
}

export function collectibleColor(t: CollectibleType): string {
  return COLLECTIBLE_CONFIG[t].color;
}

// ─── Obstacles (drawn, not emoji — they must read instantly as hazards) ──────
export type ObstacleType = "rock" | "log" | "crate";

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  seed: number;
}

const OBSTACLE_SIZES: Record<ObstacleType, { w: number; h: number }> = {
  rock: { w: 42, h: 34 },
  log: { w: 54, h: 28 },
  crate: { w: 38, h: 38 },
};

const OBSTACLE_TYPES: ObstacleType[] = ["rock", "log", "crate"];

let nextObstacleId = 0;

export function createObstacle(spawnX: number): Obstacle {
  const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  const { w, h } = OBSTACLE_SIZES[type];
  return {
    id: nextObstacleId++,
    x: spawnX,
    y: GROUND_Y - h,
    width: w,
    height: h,
    type,
    seed: Math.random() * 100,
  };
}
