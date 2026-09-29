import { Audio } from "Dora";
import type { MoveResult } from "Script/Core";

const SFX = {
  ui: "Audio/ui.wav",
  move: "Audio/move.wav",
  split: "Audio/split.wav",
  merge: "Audio/merge.wav",
  divider: "Audio/divider.wav",
  spawn: "Audio/spawn.wav",
  victory: "Audio/victory.wav",
  gameOver: "Audio/game-over.wav",
};

export class AudioManager {
  private volume = 1;

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    Audio.globalVolume = this.volume;
  }

  playUi(): void { this.play(SFX.ui); }
  playSpawn(): void { this.play(SFX.spawn); }
  playVictory(): void { this.play(SFX.victory); }
  playGameOver(): void { this.play(SFX.gameOver); }

  playMove(result: MoveResult): void {
    if (result.dividerEvents.length > 0 || result.multiplierEvents.length > 0 || result.rootEvents.length > 0 || result.cookieEvents.some(event => event.triggered)) this.play(SFX.divider);
    else if (result.splitEvents.length > 0) this.play(SFX.split);
    else if (result.mergeEvents.length > 0 || result.dividerMergeEvents.length > 0 || result.multiplierMergeEvents.length > 0) this.play(SFX.merge);
    else this.play(SFX.move);
  }

  private play(filename: string): void {
    if (this.volume > 0.001) Audio.play(filename, false);
  }
}
