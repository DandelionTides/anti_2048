import type { MoveResult, SplitEvent } from "Script/Core";

export interface ScoreFormula {
  splitScore(event: SplitEvent): number;
  dividerScore(_result: MoveResult): number;
}

export class DefaultScoreFormula implements ScoreFormula {
  splitScore(event: SplitEvent): number {
    return event.originalValue;
  }

  dividerScore(_result: MoveResult): number {
    return 0;
  }
}

export class ScoreManager {
  private readonly formula: ScoreFormula;

  constructor(formula: ScoreFormula = new DefaultScoreFormula()) {
    this.formula = formula;
  }

  calculate(result: MoveResult): number {
    return result.splitEvents.reduce((total, event) => total + this.formula.splitScore(event), 0)
      + this.formula.dividerScore(result);
  }
}
