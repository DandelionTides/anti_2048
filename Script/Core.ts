import type { DifficultyPreset, GameMode } from "Script/Config";
import { NORMAL_PRESET, UNDO_HISTORY_LIMIT } from "Script/Config";
import { ScoreManager } from "Script/ScoreManager";
import { decodeJson, encodeJson } from "Script/Json";
import { doraRandom } from "Script/Random";

export type { DifficultyPreset } from "Script/Config";
export { NORMAL_PRESET } from "Script/Config";

export type Direction = "left" | "right" | "up" | "down";

export type Position = { row: number; col: number };

export type EmptyCell = { kind: "EMPTY" };

export type NumberTile = {
  kind: "NUMBER";
  id: number;
  value: number;
  createdBySplitThisMove: boolean;
};

export type DividerTile = {
  kind: "DIVIDER";
  id: number;
  divisor: number;
};

export type Cell = EmptyCell | NumberTile | DividerTile;

export interface BoardState {
  size: number;
  cells: Cell[];
  nextTileId: number;
}

export interface SplitEvent {
  source: Position;
  destination: Position;
  originalValue: number;
  resultValue: number;
  sourceTileId: number;
  createdTileId?: number;
}

export interface MergeEvent {
  sources: [Position, Position];
  destination: Position;
  sourceTileIds: [number, number];
  resultTileId: number;
  resultValue: number;
}

export interface DividerMergeEvent {
  sources: [Position, Position];
  destination: Position;
  sourceTileIds: [number, number];
  resultTileId: number;
  resultDivisor: number;
}

export interface MoveEvent {
  tileId: number;
  from: Position;
  to: Position;
}

export interface DividerEvent {
  position: Position;
  divisor: number;
  originalValue: number;
  resultValue: number;
  tileId: number;
  dividerTileId: number;
}

export interface SpawnEvent {
  position: Position;
  tileId: number;
  tile: DividerTile | NumberTile;
}

export interface MoveResult {
  state: BoardState;
  splitEvents: SplitEvent[];
  mergeEvents: MergeEvent[];
  dividerMergeEvents: DividerMergeEvent[];
  dividerEvents: DividerEvent[];
  moveEvents: MoveEvent[];
  spawnEvents: SpawnEvent[];
  scoreDelta: number;
  changed: boolean;
}

export type RandomSource = () => number;

const EMPTY: EmptyCell = { kind: "EMPTY" };

function emptyCell(): EmptyCell {
  return EMPTY;
}

function cloneCell(cell: Cell): Cell {
  if (cell.kind === "EMPTY") return emptyCell();
  if (cell.kind === "DIVIDER") return { ...cell };
  return { ...cell, createdBySplitThisMove: false };
}

function copyPosition(position: Position): Position {
  return { row: position.row, col: position.col };
}

export function indexOf(size: number, position: Position): number {
  return position.row * size + position.col;
}

export function positionOf(size: number, index: number): Position {
  return { row: Math.floor(index / size), col: index % size };
}

export function getCell(state: BoardState, position: Position): Cell {
  return state.cells[indexOf(state.size, position)];
}

export function createEmptyBoard(size: number): BoardState {
  if (!Number.isInteger(size) || size < 2) {
    throw new Error("board size must be an integer >= 2");
  }
  return {
    size,
    cells: Array.from({ length: size * size }, () => emptyCell()),
    nextTileId: 1,
  };
}

function validatePowerOfTwo(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 2 || (value & (value - 1)) !== 0) {
    throw new Error(`${label} must be a power of two greater than 1`);
  }
}

export function validatePreset(preset: DifficultyPreset): void {
  const capacity = preset.boardSize * preset.boardSize;
  if (preset.initialValues.length === 0) throw new Error("initialValues cannot be empty");
  if (preset.initialValues.some(value => !Number.isInteger(value) || value < 1)) {
    throw new Error("initialValues must contain positive integers");
  }
  if (preset.initialTileCount < 0 || preset.initialTileCount > capacity - preset.minInitialEmptyCells) {
    throw new Error("initialTileCount violates minInitialEmptyCells");
  }
  if (preset.initialValues.length < preset.initialTileCount) {
    throw new Error("initialValues must provide one configured value per initial tile");
  }
  preset.allowedDivisors.forEach(value => validatePowerOfTwo(value, "divider"));
  if (!Number.isInteger(preset.dividerSpawnInterval) || preset.dividerSpawnInterval < 1) {
    throw new Error("dividerSpawnInterval must be a positive integer");
  }
  let previousStageMove = 0;
  for (let index = 0; index < preset.endlessNumberStages.length; index += 1) {
    const stage = preset.endlessNumberStages[index];
    if (!Number.isInteger(stage.fromMove) || stage.fromMove < 1 || stage.fromMove <= previousStageMove) {
      throw new Error("endlessNumberStages must be ordered by positive fromMove values");
    }
    if (stage.values.length === 0 || stage.values.some(value => !Number.isInteger(value) || value < 1)) {
      throw new Error("endlessNumberStages must contain positive integer values");
    }
    previousStageMove = stage.fromMove;
  }
  if (preset.targetRule === "ENDLESS" && (preset.endlessNumberStages.length === 0 || preset.endlessNumberStages[0].fromMove !== 1)) {
    throw new Error("endless mode requires a number stage beginning at move 1");
  }
}

export function endlessNumberPoolForMove(preset: DifficultyPreset, moveCount: number): number[] {
  if (preset.endlessNumberStages.length === 0) throw new Error("endless number stages are not configured");
  let values = preset.endlessNumberStages[0].values;
  for (let index = 1; index < preset.endlessNumberStages.length; index += 1) {
    const stage = preset.endlessNumberStages[index];
    if (moveCount < stage.fromMove) break;
    values = stage.values;
  }
  return values;
}

function randomIndex(length: number, random: RandomSource): number {
  if (length <= 0) throw new Error("cannot choose from an empty list");
  return Math.min(length - 1, Math.floor(random() * length));
}

export function initializeBoard(
  preset: DifficultyPreset = NORMAL_PRESET,
  random: RandomSource = doraRandom,
): BoardState {
  validatePreset(preset);
  const state = createEmptyBoard(preset.boardSize);
  const available = Array.from({ length: state.cells.length }, (_, index) => index);
  const valueDeck: number[] = [];
  for (let index = 0; index < preset.initialValues.length; index += 1) {
    valueDeck.push(preset.initialValues[index]);
  }
  for (let count = 0; count < preset.initialTileCount; count += 1) {
    const slot = randomIndex(available.length, random);
    const index = available.splice(slot, 1)[0];
    const valueSlot = randomIndex(valueDeck.length, random);
    const value = valueDeck.splice(valueSlot, 1)[0];
    state.cells[index] = {
      kind: "NUMBER",
      id: state.nextTileId++,
      value,
      createdBySplitThisMove: false,
    };
  }
  return state;
}

export function cloneBoard(state: BoardState): BoardState {
  return {
    size: state.size,
    cells: state.cells.map(cell => (cell.kind === "EMPTY" ? emptyCell() : { ...cell })),
    nextTileId: state.nextTileId,
  };
}

export function serializeBoard(state: BoardState): string {
  return encodeJson(state);
}

export function restoreBoard(serialized: string): BoardState {
  const parsed = decodeJson<BoardState>(serialized);
  if (!Number.isInteger(parsed.size) || parsed.cells.length !== parsed.size * parsed.size) {
    throw new Error("invalid saved board");
  }
  parsed.cells.forEach(cell => {
    if (cell.kind === "NUMBER" && (!Number.isInteger(cell.value) || cell.value < 1)) {
      throw new Error("invalid number tile in saved board");
    }
    if (cell.kind === "DIVIDER") validatePowerOfTwo(cell.divisor, "saved divider");
  });
  return cloneBoard(parsed);
}

function linePositions(size: number, direction: Direction, line: number): Position[] {
  const result: Position[] = [];
  for (let offset = 0; offset < size; offset += 1) {
    if (direction === "left") result.push({ row: line, col: offset });
    else if (direction === "right") result.push({ row: line, col: size - 1 - offset });
    else if (direction === "up") result.push({ row: offset, col: line });
    else result.push({ row: size - 1 - offset, col: line });
  }
  return result;
}

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

type TileWithPosition = { tile: NumberTile | DividerTile; position: Position };

export interface DividerInteractionResult {
  tile?: NumberTile;
  event: DividerEvent;
}

/** Resolves one NUMBER hitting one DIVIDER. The NUMBER keeps its identity. */
export function resolveDividerInteraction(
  moving: NumberTile,
  divider: DividerTile,
  position: Position,
): DividerInteractionResult {
  const quotient = Math.floor(moving.value / divider.divisor);
  const resultValue = quotient >= 1 ? quotient : 0;
  return {
    tile: resultValue > 0 ? { ...moving, value: resultValue } : undefined,
    event: {
      position: copyPosition(position),
      divisor: divider.divisor,
      originalValue: moving.value,
      resultValue,
      tileId: moving.id,
      dividerTileId: divider.id,
    },
  };
}

function runSplitPhase(state: BoardState, direction: Direction, splitEvents: SplitEvent[]): void {
  const size = state.size;
  const initialEmpty = state.cells.map(cell => cell.kind === "EMPTY");
  if (!initialEmpty.some(value => value)) return;
  const originalNumberIds = state.cells
    .filter((cell): cell is NumberTile => cell.kind === "NUMBER")
    .map(cell => cell.id);

  // Empty capacity is line-local because tiles never cross rows/columns during a move.
  // Snapshot indices are consumed even when splitting 1 leaves the destination empty.
  for (let line = 0; line < size; line += 1) {
    const positions = linePositions(size, direction, line);
    const available = positions
      .map((position, order) => ({ position, order, consumed: !initialEmpty[indexOf(size, position)] }))
      .filter(item => !item.consumed);
    for (const source of positions) {
      if (available.every(item => item.consumed)) break;
      const sourceIndex = indexOf(size, source);
      const cell = state.cells[sourceIndex];
      if (cell.kind !== "NUMBER" || !originalNumberIds.includes(cell.id)) continue;
      const sourceOrder = positions.findIndex(position => samePosition(position, source));
      let destinationEntry = available.find(item => !item.consumed)!;
      for (const candidate of available) {
        if (
          !candidate.consumed &&
          Math.abs(candidate.order - sourceOrder) < Math.abs(destinationEntry.order - sourceOrder)
        ) destinationEntry = candidate;
      }
      destinationEntry.consumed = true;
      const destination = destinationEntry.position;
      const destinationIndex = indexOf(size, destination);
      const resultValue = cell.value === 1 ? 0 : cell.value / 2;
      const event: SplitEvent = {
        source: copyPosition(source),
        destination: copyPosition(destination),
        originalValue: cell.value,
        resultValue,
        sourceTileId: cell.id,
      };
      if (resultValue === 0) {
        state.cells[sourceIndex] = emptyCell();
      } else {
        state.cells[sourceIndex] = {
          kind: "NUMBER",
          id: cell.id,
          value: resultValue,
          createdBySplitThisMove: true,
        };
        const createdTileId = state.nextTileId++;
        state.cells[destinationIndex] = {
          kind: "NUMBER",
          id: createdTileId,
          value: resultValue,
          createdBySplitThisMove: true,
        };
        event.createdTileId = createdTileId;
      }
      splitEvents.push(event);
    }
  }
}

/**
 * Moves each line toward its leading edge and consumes every Divider a NUMBER
 * actually crosses. Pending dividers are resolved nearest-first.
 */
function runMovementAndDividerPhase(
  state: BoardState,
  direction: Direction,
  dividerEvents: DividerEvent[],
): void {
  for (let line = 0; line < state.size; line += 1) {
    const positions = linePositions(state.size, direction, line);
    const tiles: TileWithPosition[] = [];
    for (const position of positions) {
      const cell = getCell(state, position);
      if (cell.kind !== "EMPTY") tiles.push({ tile: cell, position: copyPosition(position) });
    }

    const moved: Array<NumberTile | DividerTile> = [];
    let pendingDividers: TileWithPosition[] = [];
    for (const item of tiles) {
      if (item.tile.kind === "DIVIDER") {
        pendingDividers.push(item);
        continue;
      }

      let number: NumberTile | undefined = item.tile;
      for (let index = pendingDividers.length - 1; index >= 0 && number; index -= 1) {
        const dividerItem = pendingDividers[index];
        const interaction = resolveDividerInteraction(
          number,
          dividerItem.tile as DividerTile,
          dividerItem.position,
        );
        dividerEvents.push(interaction.event);
        number = interaction.tile;
      }
      pendingDividers = [];
      if (number) moved.push(number);
    }
    pendingDividers.forEach(item => moved.push(item.tile));

    positions.forEach(position => {
      state.cells[indexOf(state.size, position)] = emptyCell();
    });
    moved.forEach((tile, index) => {
      state.cells[indexOf(state.size, positions[index])] = tile;
    });
  }
}

function runMergePhase(
  state: BoardState,
  direction: Direction,
  mergeEvents: MergeEvent[],
  dividerMergeEvents: DividerMergeEvent[],
): number {
  let scoreDelta = 0;
  for (let line = 0; line < state.size; line += 1) {
    const positions = linePositions(state.size, direction, line);
    const tiles: TileWithPosition[] = [];
    for (const position of positions) {
      const cell = getCell(state, position);
      if (cell.kind !== "EMPTY") tiles.push({ tile: cell, position: copyPosition(position) });
    }

    const merged: TileWithPosition[] = [];
    let cursor = 0;
    while (cursor < tiles.length) {
      const first = tiles[cursor];
      const second = tiles[cursor + 1];
      if (
        second !== undefined &&
        first.tile.kind === "NUMBER" &&
        second.tile.kind === "NUMBER" &&
        first.tile.value === second.tile.value &&
        !first.tile.createdBySplitThisMove &&
        !second.tile.createdBySplitThisMove
      ) {
        const resultValue = first.tile.value * 2;
        const resultTileId = state.nextTileId++;
        const result: NumberTile = {
          kind: "NUMBER",
          id: resultTileId,
          value: resultValue,
          createdBySplitThisMove: false,
        };
        merged.push({ tile: result, position: copyPosition(first.position) });
        mergeEvents.push({
          sources: [copyPosition(first.position), copyPosition(second.position)],
          destination: copyPosition(first.position),
          sourceTileIds: [first.tile.id, second.tile.id],
          resultTileId,
          resultValue,
        });
        scoreDelta += resultValue;
        cursor += 2;
      } else if (
        second !== undefined &&
        first.tile.kind === "DIVIDER" &&
        second.tile.kind === "DIVIDER" &&
        first.tile.divisor === second.tile.divisor
      ) {
        const resultDivisor = first.tile.divisor * 2;
        const resultTileId = state.nextTileId++;
        const result: DividerTile = {
          kind: "DIVIDER",
          id: resultTileId,
          divisor: resultDivisor,
        };
        merged.push({ tile: result, position: copyPosition(first.position) });
        dividerMergeEvents.push({
          sources: [copyPosition(first.position), copyPosition(second.position)],
          destination: copyPosition(first.position),
          sourceTileIds: [first.tile.id, second.tile.id],
          resultTileId,
          resultDivisor,
        });
        cursor += 2;
      } else {
        merged.push(first);
        cursor += 1;
      }
    }

    positions.forEach(position => {
      state.cells[indexOf(state.size, position)] = emptyCell();
    });
    merged.forEach(item => {
      state.cells[indexOf(state.size, item.position)] = item.tile;
    });
  }
  return scoreDelta;
}

function runCompressPhase(state: BoardState, direction: Direction): void {
  for (let line = 0; line < state.size; line += 1) {
    const positions = linePositions(state.size, direction, line);
    const tiles: TileWithPosition[] = [];
    for (const position of positions) {
      const cell = getCell(state, position);
      if (cell.kind !== "EMPTY") tiles.push({ tile: cell, position: copyPosition(position) });
    }
    positions.forEach(position => {
      state.cells[indexOf(state.size, position)] = emptyCell();
    });
    tiles.forEach((item, index) => {
      const destination = positions[index];
      state.cells[indexOf(state.size, destination)] = item.tile;
    });
  }
}

function collectTilePositions(state: BoardState): Array<{ tileId: number; position: Position }> {
  const positions: Array<{ tileId: number; position: Position }> = [];
  state.cells.forEach((cell, index) => {
    if (cell.kind !== "EMPTY") positions.push({ tileId: cell.id, position: positionOf(state.size, index) });
  });
  return positions;
}

function buildMoveEvents(
  starts: Array<{ tileId: number; position: Position }>,
  state: BoardState,
  mergeEvents: MergeEvent[],
  dividerMergeEvents: DividerMergeEvent[],
): MoveEvent[] {
  const result: MoveEvent[] = [];
  const mergeStarts = mergeEvents.map(event => ({ tileId: event.resultTileId, position: event.destination }));
  const dividerMergeStarts = dividerMergeEvents.map(event => ({
    tileId: event.resultTileId,
    position: event.destination,
  }));
  for (const end of collectTilePositions(state)) {
    const start = starts.find(item => item.tileId === end.tileId)
      ?? mergeStarts.find(item => item.tileId === end.tileId)
      ?? dividerMergeStarts.find(item => item.tileId === end.tileId);
    if (start && !samePosition(start.position, end.position)) {
      result.push({ tileId: end.tileId, from: copyPosition(start.position), to: copyPosition(end.position) });
    }
  }
  return result;
}

function clearSplitProtection(state: BoardState): void {
  state.cells.forEach(cell => {
    if (cell.kind === "NUMBER") cell.createdBySplitThisMove = false;
  });
}

function sameBoard(a: BoardState, b: BoardState): boolean {
  if (a.size !== b.size) return false;
  for (let index = 0; index < a.cells.length; index += 1) {
    const left = a.cells[index];
    const right = b.cells[index];
    if (left.kind !== right.kind) return false;
    if (left.kind === "NUMBER" && right.kind === "NUMBER" && left.value !== right.value) return false;
    if (left.kind === "DIVIDER" && right.kind === "DIVIDER" && left.divisor !== right.divisor) return false;
  }
  return true;
}

export function spawnDivider(
  state: BoardState,
  allowedDivisors: number[],
  random: RandomSource = doraRandom,
): SpawnEvent | undefined {
  allowedDivisors.forEach(value => validatePowerOfTwo(value, "divider"));
  const emptyIndices: number[] = [];
  state.cells.forEach((cell, index) => {
    if (cell.kind === "EMPTY") emptyIndices.push(index);
  });
  if (emptyIndices.length === 0 || allowedDivisors.length === 0) return undefined;
  const boardIndex = emptyIndices[randomIndex(emptyIndices.length, random)];
  const divisor = allowedDivisors[randomIndex(allowedDivisors.length, random)];
  const tile: DividerTile = { kind: "DIVIDER", id: state.nextTileId++, divisor };
  state.cells[boardIndex] = tile;
  return { position: positionOf(state.size, boardIndex), tileId: tile.id, tile };
}

export function spawnNumber(
  state: BoardState,
  numberPool: number[],
  random: RandomSource = doraRandom,
): SpawnEvent | undefined {
  if (numberPool.length === 0) return undefined;
  const emptyIndices: number[] = [];
  state.cells.forEach((cell, index) => {
    if (cell.kind === "EMPTY") emptyIndices.push(index);
  });
  if (emptyIndices.length === 0) return undefined;
  const boardIndex = emptyIndices[randomIndex(emptyIndices.length, random)];
  const value = numberPool[randomIndex(numberPool.length, random)];
  if (!Number.isInteger(value) || value < 1) throw new Error("spawned number must be a positive integer");
  const tile: NumberTile = {
    kind: "NUMBER",
    id: state.nextTileId++,
    value,
    createdBySplitThisMove: false,
  };
  state.cells[boardIndex] = tile;
  return { position: positionOf(state.size, boardIndex), tileId: tile.id, tile };
}

export function executeMove(
  original: BoardState,
  direction: Direction,
  options: { spawnDividerAfterMove?: boolean; allowedDivisors?: number[]; random?: RandomSource } = {},
): MoveResult {
  const state: BoardState = {
    size: original.size,
    cells: original.cells.map(cell => cloneCell(cell)),
    nextTileId: original.nextTileId,
  };
  const splitEvents: SplitEvent[] = [];
  const mergeEvents: MergeEvent[] = [];
  const dividerMergeEvents: DividerMergeEvent[] = [];
  const dividerEvents: DividerEvent[] = [];
  const spawnEvents: SpawnEvent[] = [];

  // Required order: snapshot/split -> move+divider triggers -> merge -> final compress.
  runSplitPhase(state, direction, splitEvents);
  const movementStarts = collectTilePositions(state);
  runMovementAndDividerPhase(state, direction, dividerEvents);
  runMergePhase(state, direction, mergeEvents, dividerMergeEvents);
  runCompressPhase(state, direction);
  const moveEvents = buildMoveEvents(movementStarts, state, mergeEvents, dividerMergeEvents);
  const changed = !sameBoard(original, state);

  if (changed && options.spawnDividerAfterMove) {
    const event = spawnDivider(state, options.allowedDivisors ?? [], options.random ?? doraRandom);
    if (event) spawnEvents.push(event);
  }
  clearSplitProtection(state);
  return {
    state,
    splitEvents,
    dividerEvents,
    mergeEvents,
    dividerMergeEvents,
    moveEvents,
    spawnEvents,
    scoreDelta: 0,
    changed,
  };
}

export interface VictoryCondition {
  evaluate(state: BoardState): "playing" | "victory" | "defeat";
}

export class NormalVictoryCondition implements VictoryCondition {
  evaluate(state: BoardState): "playing" | "victory" | "defeat" {
    const hasNumber = state.cells.some(cell => cell.kind === "NUMBER");
    if (!hasNumber) return "victory";
    return hasAnyLegalMove(state) ? "playing" : "defeat";
  }
}

export class EndlessVictoryCondition implements VictoryCondition {
  evaluate(state: BoardState): "playing" | "victory" | "defeat" {
    return hasAnyLegalMove(state) ? "playing" : "defeat";
  }
}

export function hasAnyLegalMove(state: BoardState): boolean {
  const directions: Direction[] = ["left", "right", "up", "down"];
  return directions.some(direction => executeMove(state, direction).changed);
}

export class GameSession {
  state: BoardState;
  moveCount = 0;
  score = 0;
  readonly history: string[] = [];
  readonly victoryCondition: VictoryCondition;
  readonly preset: DifficultyPreset;
  readonly random: RandomSource;
  readonly mode: GameMode;
  readonly timed: boolean;
  readonly scoreManager: ScoreManager;
  readonly maxHistory: number;
  runStatus: "playing" | "paused" | "victory" | "defeat" = "playing";

  constructor(
    preset: DifficultyPreset = NORMAL_PRESET,
    random: RandomSource = doraRandom,
    victoryCondition: VictoryCondition = new NormalVictoryCondition(),
    initialState?: BoardState,
    options: {
      mode?: GameMode;
      timed?: boolean;
      scoreManager?: ScoreManager;
      maxHistory?: number;
    } = {},
  ) {
    this.preset = preset;
    this.random = random;
    this.state = initialState ? cloneBoard(initialState) : initializeBoard(preset, random);
    this.mode = options.mode ?? "difficulty";
    this.timed = options.timed ?? preset.defaultTimed;
    this.scoreManager = options.scoreManager ?? new ScoreManager();
    this.maxHistory = options.maxHistory ?? UNDO_HISTORY_LIMIT;
    this.victoryCondition = this.mode === "endless" || preset.targetRule === "ENDLESS"
      ? new EndlessVictoryCondition()
      : victoryCondition;
    const initialStatus = this.victoryCondition.evaluate(this.state);
    this.runStatus = initialStatus === "playing" ? "playing" : initialStatus;
  }

  move(direction: Direction): MoveResult {
    if (this.runStatus !== "playing") return executeMove(this.state, direction);
    const before = encodeJson({
      state: this.state,
      moveCount: this.moveCount,
      score: this.score,
      runStatus: this.runStatus,
    });
    const result = executeMove(this.state, direction);
    if (result.changed) {
      result.scoreDelta = this.scoreManager.calculate(result);
      this.history.push(before);
      if (this.history.length > this.maxHistory) this.history.shift();
      const nextMoveCount = this.moveCount + 1;
      if (nextMoveCount % this.preset.dividerSpawnInterval === 0) {
        const divider = spawnDivider(result.state, this.preset.allowedDivisors, this.random);
        if (divider) result.spawnEvents.push(divider);
      }
      if (this.mode === "endless") {
        const number = spawnNumber(result.state, endlessNumberPoolForMove(this.preset, nextMoveCount), this.random);
        if (number) result.spawnEvents.push(number);
      }
      this.state = result.state;
      this.moveCount += 1;
      this.score += result.scoreDelta;
      const evaluated = this.victoryCondition.evaluate(this.state);
      this.runStatus = evaluated === "playing" ? "playing" : evaluated;
    }
    return result;
  }

  undo(): boolean {
    const serialized = this.history.pop();
    if (!serialized) return false;
    const snapshot = decodeJson<{
      state: BoardState;
      moveCount: number;
      score: number;
      runStatus: "playing" | "paused" | "victory" | "defeat";
    }>(serialized);
    this.state = restoreBoard(encodeJson(snapshot.state));
    this.moveCount = snapshot.moveCount;
    this.score = snapshot.score;
    this.runStatus = snapshot.runStatus;
    return true;
  }

  pause(): void {
    if (this.runStatus === "playing") this.runStatus = "paused";
  }

  resume(): void {
    if (this.runStatus === "paused") this.runStatus = "playing";
  }

  status(): "playing" | "victory" | "defeat" {
    if (this.runStatus === "paused") return "playing";
    return this.runStatus === "victory" ? "victory" : this.runStatus === "defeat" ? "defeat" : "playing";
  }
}
