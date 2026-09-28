export class GameTimer {
  private elapsedMs = 0;
  private running = false;
  readonly enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  start(): void {
    if (this.enabled) this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    if (this.enabled) this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  update(deltaSeconds: number): void {
    if (this.running && deltaSeconds > 0) this.elapsedMs += deltaSeconds * 1000;
  }

  get milliseconds(): number {
    return Math.floor(this.elapsedMs);
  }
}

export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number, width: number) => {
    let text = `${value}`;
    while (text.length < width) text = `0${text}`;
    return text;
  };
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
}
