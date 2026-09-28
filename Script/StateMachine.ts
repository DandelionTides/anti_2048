export type ScreenState =
  | "MAIN_MENU"
  | "MODE_SELECT"
  | "DIFFICULTY_SELECT"
  | "TIMER_SELECT"
  | "PLAYING"
  | "PAUSED"
  | "RULES"
  | "GAME_OVER"
  | "VICTORY"
  | "SETTINGS";

export class ScreenStateMachine {
  current: ScreenState = "MAIN_MENU";
  previous: ScreenState = "MAIN_MENU";

  go(next: ScreenState): void {
    if (next === this.current) return;
    this.previous = this.current;
    this.current = next;
  }
}

