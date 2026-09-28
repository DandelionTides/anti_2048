export type GameMode = "difficulty" | "endless";
export type TargetRule = "CLEAR_ALL_NUMBERS" | "ENDLESS";

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
  dividerSpawnInterval: number;
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
  dividerSpawnInterval: 2,
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
  dividerSpawnInterval: 2,
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
  dividerSpawnInterval: 2,
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
    { fromMove: 20, values: [1, 2, 2, 4, 4, 8, 8] },
    { fromMove: 50, values: [2, 4, 4, 8, 8, 16, 16, 16] },
    { fromMove: 100, values: [4, 8, 8, 16, 16, 32, 32, 32, 32] },
    { fromMove: 160, values: [8, 16, 16, 32, 32, 64, 64, 64, 64, 64] },
    { fromMove: 240, values: [16, 32, 32, 64, 64, 128, 128, 128, 128, 128, 128] },
    { fromMove: 360, values: [32, 64, 64, 128, 128, 256, 256, 256, 256, 256, 256, 256] },
  ],
};

export const DIFFICULTY_PRESETS = [EASY_PRESET, NORMAL_PRESET, HARD_PRESET];
export const UNDO_HISTORY_LIMIT = 10;
