export type GameMode = "difficulty" | "endless" | "tutorial";
export type TargetRule = "CLEAR_ALL_NUMBERS" | "ENDLESS";
export type OperatorKind = "DIVIDER" | "MULTIPLIER" | "ROOT" | "COOKIE";

export interface EndlessNumberStage {
  fromMove: number;
  values: number[];
}

export interface DifficultyPreset {
  id: "easy" | "normal" | "hard" | "endless";
  name: string;
  boardSize: number;
  initialTileCount: number;
  /** Exact without-replacement deck; its sum is the finite-mode starting total. */
  initialValues: number[];
  minInitialEmptyCells: number;
  allowedDivisors: number[];
  allowedMultipliers: number[];
  /** Repeated kinds are deliberate probability weights and never scale with move count. */
  operatorPool: OperatorKind[];
  operatorSpawnInterval: number;
  /** Endless chooses one tile per effective swipe from NUMBER vs OPERATOR. */
  endlessNumberChance: number;
  defaultTimed: boolean;
  targetRule: TargetRule;
  /** Repeated values are deliberate probability weights for endless spawns. */
  endlessNumberStages: EndlessNumberStage[];
}

export const EASY_PRESET: DifficultyPreset = {
  id: "easy",
  name: "简单",
  boardSize: 4,
  initialTileCount: 8,
  initialValues: [4, 4, 4, 4, 8, 8, 16, 16],
  minInitialEmptyCells: 4,
  allowedDivisors: [2, 4],
  allowedMultipliers: [2, 4],
  operatorPool: ["DIVIDER", "DIVIDER", "MULTIPLIER", "ROOT", "COOKIE"],
  operatorSpawnInterval: 2,
  endlessNumberChance: 0.6,
  defaultTimed: false,
  targetRule: "CLEAR_ALL_NUMBERS",
  endlessNumberStages: [],
};

export const NORMAL_PRESET: DifficultyPreset = {
  id: "normal",
  name: "普通",
  boardSize: 4,
  initialTileCount: 10,
  initialValues: [4, 4, 4, 4, 8, 8, 16, 16, 32, 32],
  minInitialEmptyCells: 4,
  allowedDivisors: [2, 4, 8],
  allowedMultipliers: [2, 4],
  operatorPool: ["DIVIDER", "DIVIDER", "MULTIPLIER", "MULTIPLIER", "ROOT", "COOKIE"],
  operatorSpawnInterval: 2,
  endlessNumberChance: 0.6,
  defaultTimed: false,
  targetRule: "CLEAR_ALL_NUMBERS",
  endlessNumberStages: [],
};

export const HARD_PRESET: DifficultyPreset = {
  id: "hard",
  name: "困难",
  boardSize: 4,
  initialTileCount: 12,
  initialValues: [8, 8, 8, 8, 16, 16, 16, 16, 32, 32, 32, 64],
  minInitialEmptyCells: 4,
  allowedDivisors: [2, 4, 8, 16],
  allowedMultipliers: [2, 4],
  operatorPool: ["DIVIDER", "DIVIDER", "MULTIPLIER", "MULTIPLIER", "ROOT", "COOKIE"],
  operatorSpawnInterval: 2,
  endlessNumberChance: 0.6,
  defaultTimed: true,
  targetRule: "CLEAR_ALL_NUMBERS",
  endlessNumberStages: [],
};

export const ENDLESS_PRESET: DifficultyPreset = {
  ...NORMAL_PRESET,
  id: "endless",
  name: "无尽",
  targetRule: "ENDLESS",
  endlessNumberStages: [
    { fromMove: 1, values: [1, 1, 1, 2, 2, 4] },
    { fromMove: 30, values: [1, 2, 2, 4, 4, 8, 8] },
    { fromMove: 70, values: [2, 4, 4, 8, 8, 16, 16, 16] },
    { fromMove: 120, values: [4, 8, 8, 16, 16, 32, 32, 32, 32] },
    { fromMove: 190, values: [8, 16, 16, 32, 32, 64, 64, 64, 64, 64] },
    { fromMove: 280, values: [16, 32, 32, 64, 64, 128, 128, 128, 128, 128, 128] },
    { fromMove: 400, values: [32, 64, 64, 128, 128, 256, 256, 256, 256, 256, 256, 256] },
  ],
};

export const DIFFICULTY_PRESETS = [EASY_PRESET, NORMAL_PRESET, HARD_PRESET];
export const UNDO_HISTORY_LIMIT = 10;
