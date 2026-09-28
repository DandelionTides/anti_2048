import type { DifficultyPreset } from "Script/Config";
import { decodeJson, encodeJson } from "Script/Json";

export const SAVE_VERSION = 2;

export interface DifficultyRecord {
  bestScore: number;
  bestTimeMs?: number;
}

export interface SaveData {
  saveVersion: number;
  volume: number;
  endlessBestScore: number;
  endlessHighestNumber: number;
  difficultyRecords: Record<string, DifficultyRecord>;
}

export interface StoragePort {
  load(): string | undefined;
  save(content: string): boolean;
}

export function defaultSaveData(): SaveData {
  return {
    saveVersion: SAVE_VERSION,
    volume: 0.8,
    endlessBestScore: 0,
    endlessHighestNumber: 0,
    difficultyRecords: {},
  };
}

export class SaveRepository {
  data: SaveData;
  private readonly storage: StoragePort;

  constructor(storage: StoragePort) {
    this.storage = storage;
    this.data = this.read();
  }

  private read(): SaveData {
    try {
      const content = this.storage.load();
      if (!content) return defaultSaveData();
      const parsed = decodeJson<Partial<SaveData>>(content);
      const defaults = defaultSaveData();
      return {
        saveVersion: SAVE_VERSION,
        volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : defaults.volume,
        endlessBestScore: Math.max(0, parsed.endlessBestScore ?? 0),
        endlessHighestNumber: Math.max(0, parsed.endlessHighestNumber ?? 0),
        difficultyRecords: parsed.difficultyRecords ?? {},
      };
    } catch {
      return defaultSaveData();
    }
  }

  persist(): boolean {
    this.data.saveVersion = SAVE_VERSION;
    return this.storage.save(encodeJson(this.data));
  }

  setVolume(value: number): void {
    this.data.volume = Math.max(0, Math.min(1, value));
    this.persist();
  }

  recordDifficulty(preset: DifficultyPreset, score: number, timeMs?: number): void {
    const previous = this.data.difficultyRecords[preset.id] ?? { bestScore: 0 };
    previous.bestScore = Math.max(previous.bestScore, score);
    if (timeMs !== undefined && (previous.bestTimeMs === undefined || timeMs < previous.bestTimeMs)) {
      previous.bestTimeMs = timeMs;
    }
    this.data.difficultyRecords[preset.id] = previous;
    this.persist();
  }

  recordEndless(score: number, highestNumber: number): void {
    this.data.endlessBestScore = Math.max(this.data.endlessBestScore, score);
    this.data.endlessHighestNumber = Math.max(this.data.endlessHighestNumber, highestNumber);
    this.persist();
  }
}
