import type { DifficultyPreset, GameMode, OperatorKind } from "Script/Config";
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
  cookieBlockedThisMove?: boolean;
};

export type DividerTile = {
  kind: "DIVIDER";
  id: number;
  divisor: number;
};

export type MultiplierTile = {
  kind: "MULTIPLIER";
  id: number;
  factor: number;
};

export type RootTile = {
  kind: "ROOT";
  id: number;
};

export type CookieTile = {
  kind: "COOKIE";
  id: number;
};

export type OperatorTile = DividerTile | MultiplierTile | RootTile | CookieTile;
export type Cell = EmptyCell | NumberTile | OperatorTile;

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

export interface MultiplierMergeEvent {
  sources: [Position, Position];
  destination: Position;
  sourceTileIds: [number, number];
  resultTileId: number;
  resultFactor: number;
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

export interface MultiplierEvent {
  position: Position;
  factor: number;
  originalValue: number;
  resultValue: number;
  tileId: number;
  multiplierTileId: number;
}

export interface RootEvent {
  position: Position;
  originalValue: number;
  resultValue: number;
  tileId: number;
  rootTileId: number;
}

export interface CookieEvent {
  position: Position;
  cookieTileId: number;
  triggered: boolean;
  blockedTileId?: number;
}

export interface SpawnEvent {
  position: Position;
  tileId: number;
  tile: NumberTile | OperatorTile;
}

export interface MoveResult {
  state: BoardState;
  splitEvents: SplitEvent[];
  mergeEvents: MergeEvent[];
  dividerMergeEvents: DividerMergeEvent[];
  multiplierMergeEvents: MultiplierMergeEvent[];
  dividerEvents: DividerEvent[];
  multiplierEvents: MultiplierEvent[];
  rootEvents: RootEvent[];
  cookieEvents: CookieEvent[];
  moveEvents: MoveEvent[];
  spawnEvents: SpawnEvent[];
  scoreDelta: number;
  scoreMultiplier: number;
  changed: boolean;
}

export interface GenerationRules {
  kind: "NONE" | "OPERATORS" | "ENDLESS";
  operatorPool?: OperatorKind[];
  operatorInterval?: number;
  /** Optional finite tutorial schedule. One entry is spawned at each interval. */
  operatorSequence?: OperatorKind[];
  endlessNumberChance?: number;
}

export interface TutorialGoal {
  clearNumbers?: boolean;
  targetMoves?: number;
  splitEvents?: number;
  dividerEvents?: number;
  multiplierEvents?: number;
  rootEvents?: number;
  cookieTriggers?: number;
  doubledMoves?: number;
}

export interface TutorialProgress {
  splitEvents: number;
  dividerEvents: number;
  multiplierEvents: number;
  rootEvents: number;
  cookieTriggers: number;
  doubledMoves: number;
}

export type RandomSource = () => number;

const EMPTY: EmptyCell = { kind: "EMPTY" };

function emptyCell(): EmptyCell {
  return EMPTY;
}

function cloneCell(cell: Cell): Cell {
  if (cell.kind === "EMPTY") return emptyCell();
  if (cell.kind !== "NUMBER") return { ...cell };
  return { ...cell, createdBySplitThisMove: false, cookieBlockedThisMove: false };
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
  preset.allowedMultipliers.forEach(value => validatePowerOfTwo(value, "multiplier"));
  if (preset.operatorPool.length === 0) throw new Error("operatorPool cannot be empty");
  if (!Number.isInteger(preset.operatorSpawnInterval) || preset.operatorSpawnInterval < 1) {
    throw new Error("operatorSpawnInterval must be a positive integer");
  }
  if (preset.endlessNumberChance < 0 || preset.endlessNumberChance > 1) {
    throw new Error("endlessNumberChance must be between 0 and 1");
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
    if (cell.kind === "MULTIPLIER") validatePowerOfTwo(cell.factor, "saved multiplier");
    if (cell.kind !== "EMPTY" && !Number.isInteger(cell.id)) throw new Error("invalid tile id in saved board");
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

type TileWithPosition = { tile: NumberTile | OperatorTile; position: Position; order: number };

export interface DividerInteractionResult {
  tile?: NumberTile;
  event: DividerEvent;
}

export interface MultiplierInteractionResult {
  tile: NumberTile;
  event: MultiplierEvent;
}

export interface RootInteractionResult {
  tile: NumberTile;
  event: RootEvent;
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

export function resolveMultiplierInteraction(
  moving: NumberTile,
  multiplier: MultiplierTile,
  position: Position,
): MultiplierInteractionResult {
  const resultValue = moving.value * multiplier.factor;
  return {
    tile: { ...moving, value: resultValue },
    event: {
      position: copyPosition(position),
      factor: multiplier.factor,
      originalValue: moving.value,
      resultValue,
      tileId: moving.id,
      multiplierTileId: multiplier.id,
    },
  };
}

export function floorPowerOfTwo(value: number): number {
  if (value < 1) return 0;
  let result = 1;
  while (result * 2 <= value) result *= 2;
  return result;
}

export function resolveRootInteraction(
  moving: NumberTile,
  root: RootTile,
  position: Position,
): RootInteractionResult {
  const resultValue = floorPowerOfTwo(Math.sqrt(moving.value));
  return {
    tile: { ...moving, value: resultValue },
    event: {
      position: copyPosition(position),
      originalValue: moving.value,
      resultValue,
      tileId: moving.id,
      rootTileId: root.id,
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
 * Moves each line toward its leading edge. A number resolves one-use operators
 * nearest-first along its route. Cookies expire on this swipe; a freshly split
 * number that reaches one is held immediately behind it for the rest of the move.
 */
function runMovementAndOperatorPhase(
  state: BoardState,
  direction: Direction,
  dividerEvents: DividerEvent[],
  multiplierEvents: MultiplierEvent[],
  rootEvents: RootEvent[],
  cookieEvents: CookieEvent[],
): void {
  for (let line = 0; line < state.size; line += 1) {
    const positions = linePositions(state.size, direction, line);
    const tiles: TileWithPosition[] = [];
    for (let order = 0; order < positions.length; order += 1) {
      const position = positions[order];
      const cell = getCell(state, position);
      if (cell.kind !== "EMPTY") {
        tiles.push({ tile: cell, position: copyPosition(position), order });
        if (cell.kind === "COOKIE") {
          cookieEvents.push({ position: copyPosition(position), cookieTileId: cell.id, triggered: false });
        }
      }
    }

    const moved: Cell[] = Array.from({ length: state.size }, () => emptyCell());
    let writeCursor = 0;
    let pendingDividers: TileWithPosition[] = [];
    const place = (tile: NumberTile | OperatorTile, minimumIndex = writeCursor): void => {
      let index = Math.max(writeCursor, minimumIndex);
      while (index < moved.length && moved[index].kind !== "EMPTY") index += 1;
      if (index < moved.length) {
        moved[index] = tile;
        writeCursor = index + 1;
      }
    };
    const placePendingPrefix = (endExclusive: number): void => {
      for (let index = 0; index < endExclusive; index += 1) {
        const tile = pendingDividers[index].tile;
        if (tile.kind !== "COOKIE") place(tile as OperatorTile);
      }
    };
    for (const item of tiles) {
      if (item.tile.kind !== "NUMBER") {
        pendingDividers.push(item);
        continue;
      }

      let number: NumberTile | undefined = item.tile;
      let resolvedOrBlocked = false;
      for (let index = pendingDividers.length - 1; index >= 0 && number; index -= 1) {
        const operatorItem = pendingDividers[index];
        const operator = operatorItem.tile;
        if (operator.kind === "COOKIE") {
          if (number.createdBySplitThisMove) {
            const cookieEvent = cookieEvents.find(event => event.cookieTileId === operator.id);
            if (cookieEvent) {
              cookieEvent.triggered = true;
              cookieEvent.blockedTileId = number.id;
            }
            placePendingPrefix(index);
            number = { ...number, cookieBlockedThisMove: true };
            place(number, operatorItem.order + 1);
            resolvedOrBlocked = true;
            break;
          }
        } else if (operator.kind === "DIVIDER") {
          const interaction = resolveDividerInteraction(number, operator, operatorItem.position);
          dividerEvents.push(interaction.event);
          number = interaction.tile;
          if (!number) {
            placePendingPrefix(index);
            resolvedOrBlocked = true;
          }
        } else if (operator.kind === "MULTIPLIER") {
          const interaction = resolveMultiplierInteraction(number, operator, operatorItem.position);
          multiplierEvents.push(interaction.event);
          number = interaction.tile;
        } else if (operator.kind === "ROOT") {
          const interaction = resolveRootInteraction(number, operator, operatorItem.position);
          rootEvents.push(interaction.event);
          number = interaction.tile;
        }
      }
      pendingDividers = [];
      if (number && !resolvedOrBlocked) place(number);
    }
    placePendingPrefix(pendingDividers.length);

    positions.forEach(position => {
      state.cells[indexOf(state.size, position)] = emptyCell();
    });
    for (let index = 0; index < moved.length; index += 1) {
      state.cells[indexOf(state.size, positions[index])] = moved[index];
    }
  }
}

function runMergePhase(
  state: BoardState,
  direction: Direction,
  mergeEvents: MergeEvent[],
  dividerMergeEvents: DividerMergeEvent[],
  multiplierMergeEvents: MultiplierMergeEvent[],
): number {
  let scoreDelta = 0;
  for (let line = 0; line < state.size; line += 1) {
    const positions = linePositions(state.size, direction, line);
    const starts = [0];
    for (let index = 1; index < positions.length; index += 1) {
      const cell = getCell(state, positions[index]);
      if (cell.kind === "NUMBER" && cell.cookieBlockedThisMove) starts.push(index);
    }
    for (let segmentIndex = 0; segmentIndex < starts.length; segmentIndex += 1) {
      const start = starts[segmentIndex];
      const end = segmentIndex + 1 < starts.length ? starts[segmentIndex + 1] : positions.length;
      const tiles: TileWithPosition[] = [];
      for (let order = start; order < end; order += 1) {
        const position = positions[order];
        const cell = getCell(state, position);
        if (cell.kind !== "EMPTY") tiles.push({ tile: cell, position: copyPosition(position), order });
      }

      const merged: Array<NumberTile | OperatorTile> = [];
      let cursor = 0;
      while (cursor < tiles.length) {
        const first = tiles[cursor];
        const second = tiles[cursor + 1];
        const destination = positions[start + merged.length];
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
          merged.push({ kind: "NUMBER", id: resultTileId, value: resultValue, createdBySplitThisMove: false });
          mergeEvents.push({
            sources: [copyPosition(first.position), copyPosition(second.position)],
            destination: copyPosition(destination),
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
          merged.push({ kind: "DIVIDER", id: resultTileId, divisor: resultDivisor });
          dividerMergeEvents.push({
            sources: [copyPosition(first.position), copyPosition(second.position)],
            destination: copyPosition(destination),
            sourceTileIds: [first.tile.id, second.tile.id],
            resultTileId,
            resultDivisor,
          });
          cursor += 2;
        } else if (
          second !== undefined &&
          first.tile.kind === "MULTIPLIER" &&
          second.tile.kind === "MULTIPLIER" &&
          first.tile.factor === second.tile.factor
        ) {
          const resultFactor = first.tile.factor * 2;
          const resultTileId = state.nextTileId++;
          merged.push({ kind: "MULTIPLIER", id: resultTileId, factor: resultFactor });
          multiplierMergeEvents.push({
            sources: [copyPosition(first.position), copyPosition(second.position)],
            destination: copyPosition(destination),
            sourceTileIds: [first.tile.id, second.tile.id],
            resultTileId,
            resultFactor,
          });
          cursor += 2;
        } else {
          merged.push(first.tile);
          cursor += 1;
        }
      }

      for (let order = start; order < end; order += 1) {
        state.cells[indexOf(state.size, positions[order])] = emptyCell();
      }
      for (let index = 0; index < merged.length; index += 1) {
        state.cells[indexOf(state.size, positions[start + index])] = merged[index];
      }
    }
  }
  return scoreDelta;
}

function runCompressPhase(state: BoardState, direction: Direction): void {
  for (let line = 0; line < state.size; line += 1) {
    const positions = linePositions(state.size, direction, line);
    const starts = [0];
    for (let index = 1; index < positions.length; index += 1) {
      const cell = getCell(state, positions[index]);
      if (cell.kind === "NUMBER" && cell.cookieBlockedThisMove) starts.push(index);
    }
    for (let segmentIndex = 0; segmentIndex < starts.length; segmentIndex += 1) {
      const start = starts[segmentIndex];
      const end = segmentIndex + 1 < starts.length ? starts[segmentIndex + 1] : positions.length;
      const tiles: Array<NumberTile | OperatorTile> = [];
      for (let order = start; order < end; order += 1) {
        const cell = getCell(state, positions[order]);
        if (cell.kind !== "EMPTY") tiles.push(cell);
        state.cells[indexOf(state.size, positions[order])] = emptyCell();
      }
      for (let index = 0; index < tiles.length; index += 1) {
        state.cells[indexOf(state.size, positions[start + index])] = tiles[index];
      }
    }
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
  multiplierMergeEvents: MultiplierMergeEvent[],
): MoveEvent[] {
  const result: MoveEvent[] = [];
  const mergeStarts = mergeEvents.map(event => ({ tileId: event.resultTileId, position: event.destination }));
  const dividerMergeStarts = dividerMergeEvents.map(event => ({
    tileId: event.resultTileId,
    position: event.destination,
  }));
  const multiplierMergeStarts = multiplierMergeEvents.map(event => ({
    tileId: event.resultTileId,
    position: event.destination,
  }));
  for (const end of collectTilePositions(state)) {
    const start = starts.find(item => item.tileId === end.tileId)
      ?? mergeStarts.find(item => item.tileId === end.tileId)
      ?? dividerMergeStarts.find(item => item.tileId === end.tileId)
      ?? multiplierMergeStarts.find(item => item.tileId === end.tileId);
    if (start && !samePosition(start.position, end.position)) {
      result.push({ tileId: end.tileId, from: copyPosition(start.position), to: copyPosition(end.position) });
    }
  }
  return result;
}

function clearSplitProtection(state: BoardState): void {
  state.cells.forEach(cell => {
    if (cell.kind === "NUMBER") {
      cell.createdBySplitThisMove = false;
      cell.cookieBlockedThisMove = false;
    }
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
    if (left.kind === "MULTIPLIER" && right.kind === "MULTIPLIER" && left.factor !== right.factor) return false;
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

export function spawnMultiplier(
  state: BoardState,
  allowedMultipliers: number[],
  random: RandomSource = doraRandom,
): SpawnEvent | undefined {
  allowedMultipliers.forEach(value => validatePowerOfTwo(value, "multiplier"));
  const emptyIndices: number[] = [];
  state.cells.forEach((cell, index) => {
    if (cell.kind === "EMPTY") emptyIndices.push(index);
  });
  if (emptyIndices.length === 0 || allowedMultipliers.length === 0) return undefined;
  const boardIndex = emptyIndices[randomIndex(emptyIndices.length, random)];
  const factor = allowedMultipliers[randomIndex(allowedMultipliers.length, random)];
  const tile: MultiplierTile = { kind: "MULTIPLIER", id: state.nextTileId++, factor };
  state.cells[boardIndex] = tile;
  return { position: positionOf(state.size, boardIndex), tileId: tile.id, tile };
}

export function spawnRoot(
  state: BoardState,
  random: RandomSource = doraRandom,
): SpawnEvent | undefined {
  const emptyIndices: number[] = [];
  state.cells.forEach((cell, index) => {
    if (cell.kind === "EMPTY") emptyIndices.push(index);
  });
  if (emptyIndices.length === 0) return undefined;
  const boardIndex = emptyIndices[randomIndex(emptyIndices.length, random)];
  const tile: RootTile = { kind: "ROOT", id: state.nextTileId++ };
  state.cells[boardIndex] = tile;
  return { position: positionOf(state.size, boardIndex), tileId: tile.id, tile };
}

export function spawnCookie(
  state: BoardState,
  random: RandomSource = doraRandom,
): SpawnEvent | undefined {
  const emptyIndices: number[] = [];
  state.cells.forEach((cell, index) => {
    if (cell.kind === "EMPTY") emptyIndices.push(index);
  });
  if (emptyIndices.length === 0) return undefined;
  const boardIndex = emptyIndices[randomIndex(emptyIndices.length, random)];
  const tile: CookieTile = { kind: "COOKIE", id: state.nextTileId++ };
  state.cells[boardIndex] = tile;
  return { position: positionOf(state.size, boardIndex), tileId: tile.id, tile };
}

export function spawnOperator(
  state: BoardState,
  preset: DifficultyPreset,
  operatorPool: OperatorKind[] = preset.operatorPool,
  random: RandomSource = doraRandom,
): SpawnEvent | undefined {
  if (operatorPool.length === 0) return undefined;
  const kind = operatorPool[randomIndex(operatorPool.length, random)];
  if (kind === "DIVIDER") return spawnDivider(state, preset.allowedDivisors, random);
  if (kind === "MULTIPLIER") return spawnMultiplier(state, preset.allowedMultipliers, random);
  if (kind === "ROOT") return spawnRoot(state, random);
  return spawnCookie(state, random);
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

export function spawnEndlessTile(
  state: BoardState,
  preset: DifficultyPreset,
  moveCount: number,
  operatorPool: OperatorKind[] = preset.operatorPool,
  numberChance = preset.endlessNumberChance,
  random: RandomSource = doraRandom,
): SpawnEvent | undefined {
  if (random() < numberChance) {
    return spawnNumber(state, endlessNumberPoolForMove(preset, moveCount), random);
  }
  return spawnOperator(state, preset, operatorPool, random);
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
  const multiplierMergeEvents: MultiplierMergeEvent[] = [];
  const dividerEvents: DividerEvent[] = [];
  const multiplierEvents: MultiplierEvent[] = [];
  const rootEvents: RootEvent[] = [];
  const cookieEvents: CookieEvent[] = [];
  const spawnEvents: SpawnEvent[] = [];

  // Required order: snapshot/split -> route operators nearest-first -> like-kind merge -> final compress.
  runSplitPhase(state, direction, splitEvents);
  const movementStarts = collectTilePositions(state);
  runMovementAndOperatorPhase(state, direction, dividerEvents, multiplierEvents, rootEvents, cookieEvents);
  runMergePhase(state, direction, mergeEvents, dividerMergeEvents, multiplierMergeEvents);
  runCompressPhase(state, direction);
  const moveEvents = buildMoveEvents(movementStarts, state, mergeEvents, dividerMergeEvents, multiplierMergeEvents);
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
    multiplierEvents,
    rootEvents,
    cookieEvents,
    mergeEvents,
    dividerMergeEvents,
    multiplierMergeEvents,
    moveEvents,
    spawnEvents,
    scoreDelta: 0,
    scoreMultiplier: 1,
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
  scoreMultiplierMovesRemaining = 0;
  tutorialProgress: TutorialProgress = {
    splitEvents: 0,
    dividerEvents: 0,
    multiplierEvents: 0,
    rootEvents: 0,
    cookieTriggers: 0,
    doubledMoves: 0,
  };
  readonly history: string[] = [];
  readonly victoryCondition: VictoryCondition;
  readonly preset: DifficultyPreset;
  readonly random: RandomSource;
  readonly mode: GameMode;
  readonly timed: boolean;
  readonly scoreManager: ScoreManager;
  readonly maxHistory: number;
  readonly generationRules: GenerationRules;
  readonly tutorialGoal?: TutorialGoal;
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
      generationRules?: GenerationRules;
      tutorialGoal?: TutorialGoal;
    } = {},
  ) {
    this.preset = preset;
    this.random = random;
    this.state = initialState ? cloneBoard(initialState) : initializeBoard(preset, random);
    this.mode = options.mode ?? "difficulty";
    this.timed = options.timed ?? preset.defaultTimed;
    this.scoreManager = options.scoreManager ?? new ScoreManager();
    this.maxHistory = options.maxHistory ?? UNDO_HISTORY_LIMIT;
    this.generationRules = options.generationRules ?? (this.mode === "endless"
      ? { kind: "ENDLESS" }
      : this.mode === "tutorial"
        ? { kind: "NONE" }
        : { kind: "OPERATORS", operatorInterval: preset.operatorSpawnInterval });
    this.tutorialGoal = options.tutorialGoal;
    this.victoryCondition = this.mode === "endless" || preset.targetRule === "ENDLESS"
      ? new EndlessVictoryCondition()
      : victoryCondition;
    const initialStatus = this.mode === "tutorial" && this.tutorialGoal
      ? this.meetsTutorialGoal()
        ? "victory"
        : hasAnyLegalMove(this.state) ? "playing" : "defeat"
      : this.victoryCondition.evaluate(this.state);
    this.runStatus = initialStatus === "playing" ? "playing" : initialStatus;
  }

  move(direction: Direction): MoveResult {
    if (this.runStatus !== "playing") return executeMove(this.state, direction);
    const before = encodeJson({
      state: this.state,
      moveCount: this.moveCount,
      score: this.score,
      scoreMultiplierMovesRemaining: this.scoreMultiplierMovesRemaining,
      tutorialProgress: this.tutorialProgress,
      runStatus: this.runStatus,
    });
    const result = executeMove(this.state, direction);
    if (result.changed) {
      result.scoreMultiplier = this.scoreMultiplierMovesRemaining > 0 ? 2 : 1;
      result.scoreDelta = this.scoreManager.calculate(result) * result.scoreMultiplier;
      this.history.push(before);
      if (this.history.length > this.maxHistory) this.history.shift();
      const nextMoveCount = this.moveCount + 1;
      if (this.scoreMultiplierMovesRemaining > 0) {
        this.scoreMultiplierMovesRemaining -= 1;
        this.tutorialProgress.doubledMoves += 1;
      }
      this.tutorialProgress.splitEvents += result.splitEvents.length;
      this.tutorialProgress.dividerEvents += result.dividerEvents.length;
      this.tutorialProgress.multiplierEvents += result.multiplierEvents.length;
      this.tutorialProgress.rootEvents += result.rootEvents.length;
      this.tutorialProgress.cookieTriggers += result.cookieEvents.filter(event => event.triggered).length;
      const interval = this.generationRules.operatorInterval ?? this.preset.operatorSpawnInterval;
      if (this.generationRules.kind === "OPERATORS" && nextMoveCount % interval === 0) {
        const sequence = this.generationRules.operatorSequence;
        const sequenceIndex = Math.floor(nextMoveCount / interval) - 1;
        const scheduledKind = sequence?.[sequenceIndex];
        const shouldSpawn = sequence === undefined
          || (scheduledKind !== undefined && result.state.cells.some(cell => cell.kind === "NUMBER"));
        if (shouldSpawn) {
          const operator = spawnOperator(
            result.state,
            this.preset,
            scheduledKind === undefined
              ? this.generationRules.operatorPool ?? this.preset.operatorPool
              : [scheduledKind],
            this.random,
          );
          if (operator) result.spawnEvents.push(operator);
        }
      } else if (this.generationRules.kind === "ENDLESS") {
        const tile = spawnEndlessTile(
          result.state,
          this.preset,
          nextMoveCount,
          this.generationRules.operatorPool ?? this.preset.operatorPool,
          this.generationRules.endlessNumberChance ?? this.preset.endlessNumberChance,
          this.random,
        );
        if (tile) result.spawnEvents.push(tile);
      }
      this.state = result.state;
      this.moveCount += 1;
      this.score += result.scoreDelta;
      if (result.cookieEvents.some(event => event.triggered)) this.scoreMultiplierMovesRemaining = 3;
      if (this.mode === "tutorial" && this.tutorialGoal) {
        if (this.meetsTutorialGoal()) this.runStatus = "victory";
        else this.runStatus = hasAnyLegalMove(this.state) ? "playing" : "defeat";
      } else {
        const evaluated = this.victoryCondition.evaluate(this.state);
        this.runStatus = evaluated === "playing" ? "playing" : evaluated;
      }
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
      scoreMultiplierMovesRemaining: number;
      tutorialProgress: TutorialProgress;
      runStatus: "playing" | "paused" | "victory" | "defeat";
    }>(serialized);
    this.state = restoreBoard(encodeJson(snapshot.state));
    this.moveCount = snapshot.moveCount;
    this.score = snapshot.score;
    this.scoreMultiplierMovesRemaining = snapshot.scoreMultiplierMovesRemaining ?? 0;
    this.tutorialProgress = snapshot.tutorialProgress ?? {
      splitEvents: 0,
      dividerEvents: 0,
      multiplierEvents: 0,
      rootEvents: 0,
      cookieTriggers: 0,
      doubledMoves: 0,
    };
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

  private meetsTutorialGoal(): boolean {
    const goal = this.tutorialGoal;
    if (!goal) return false;
    return (goal.clearNumbers === undefined || this.state.cells.every(cell => cell.kind !== "NUMBER"))
      && (goal.targetMoves === undefined || this.moveCount >= goal.targetMoves)
      && (goal.splitEvents === undefined || this.tutorialProgress.splitEvents >= goal.splitEvents)
      && (goal.dividerEvents === undefined || this.tutorialProgress.dividerEvents >= goal.dividerEvents)
      && (goal.multiplierEvents === undefined || this.tutorialProgress.multiplierEvents >= goal.multiplierEvents)
      && (goal.rootEvents === undefined || this.tutorialProgress.rootEvents >= goal.rootEvents)
      && (goal.cookieTriggers === undefined || this.tutorialProgress.cookieTriggers >= goal.cookieTriggers)
      && (goal.doubledMoves === undefined || this.tutorialProgress.doubledMoves >= goal.doubledMoves);
  }
}
