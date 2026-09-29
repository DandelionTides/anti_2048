import assert from "node:assert/strict";
import test from "node:test";
import { GameSession, NORMAL_PRESET, executeMove, floorPowerOfTwo, initializeBoard, resolveDividerInteraction, resolveMultiplierInteraction, resolveRootInteraction, restoreBoard, serializeBoard, } from "../Script/Core.ts";
import { boardFromRows, boardToRows } from "./TestBoard.mjs";
const noSpawn = (rows, direction) => executeMove(boardFromRows(rows), direction);
test("2 1 1 _ right -> _ _ 2 1", () => {
    const result = noSpawn([
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [2, 1, 1, null],
    ], "right");
    assert.deepEqual(boardToRows(result.state)[3], [null, null, 2, 1]);
    assert.equal(result.splitEvents.length, 1);
});
test("1 disappears when an initial empty exists", () => {
    const result = noSpawn([[1, null], [null, null]], "left");
    assert.equal(result.state.cells.filter(cell => cell.kind === "NUMBER").length, 0);
});
test("2 splits into protected 1 + 1", () => {
    const result = noSpawn([[2, null], [null, null]], "left");
    assert.deepEqual(boardToRows(result.state)[0], [1, 1]);
    assert.equal(result.mergeEvents.length, 0);
});
test("4 splits into protected 2 + 2", () => {
    const result = noSpawn([[4, null], [null, null]], "right");
    assert.deepEqual(boardToRows(result.state)[0], [2, 2]);
    assert.equal(result.mergeEvents.length, 0);
});
test("newly created empty cells are not reused by another split", () => {
    const result = noSpawn([[2, 1, 1, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], "right");
    assert.equal(result.splitEvents.length, 1);
    assert.deepEqual(boardToRows(result.state)[0], [null, null, 2, 1]);
});
test("fresh split siblings do not merge in the same move", () => {
    const result = noSpawn([[null, null], [4, null]], "left");
    assert.deepEqual(boardToRows(result.state)[1], [2, 2]);
    assert.equal(result.mergeEvents.length, 0);
});
test("split protection clears so a later full-board move can merge", () => {
    const first = noSpawn([[4, null], [8, 16]], "left");
    assert.deepEqual(boardToRows(first.state), [[2, 2], [8, 16]]);
    const second = executeMove(first.state, "left");
    assert.deepEqual(boardToRows(second.state), [[4, null], [8, 16]]);
    assert.equal(second.mergeEvents.length, 1);
});
test("a full board skips splitting", () => {
    const result = noSpawn([[2, 4], [8, 16]], "left");
    assert.equal(result.splitEvents.length, 0);
    assert.equal(result.changed, false);
});
test("a full board can still merge", () => {
    const result = noSpawn([[2, 2], [8, 16]], "left");
    assert.equal(result.splitEvents.length, 0);
    assert.deepEqual(boardToRows(result.state), [[4, null], [8, 16]]);
});
test("a tile participates in at most one merge", () => {
    const result = noSpawn([[2, 2, 2, 2], [4, 8, 16, 32], [64, 128, 256, 512], [1024, 2048, 4096, 8192]], "left");
    assert.deepEqual(boardToRows(result.state)[0], [4, 4, null, null]);
    assert.equal(result.mergeEvents.length, 2);
});
test("an unchanged move creates no divider and no history node", () => {
    const initial = boardFromRows([[2, 4], [8, 16]]);
    const session = new GameSession({ ...NORMAL_PRESET, boardSize: 2, initialTileCount: 0, minInitialEmptyCells: 0 }, () => 0, undefined, initial);
    const result = session.move("left");
    assert.equal(result.changed, false);
    assert.equal(result.spawnEvents.length, 0);
    assert.equal(session.moveCount, 0);
    assert.equal(session.history.length, 0);
});
test("divider spawns on every second effective move", () => {
    const initial = boardFromRows([
        [64, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ]);
    const session = new GameSession({ ...NORMAL_PRESET, initialTileCount: 0, allowedDivisors: [2, 8] }, () => 0, undefined, initial);
    const first = session.move("right");
    assert.equal(first.spawnEvents.length, 0);
    assert.equal(session.moveCount, 1);
    const second = session.move("left");
    assert.equal(second.spawnEvents.length, 1);
    assert.equal(second.spawnEvents[0].tile.kind, "DIVIDER");
    assert.equal(second.spawnEvents[0].tile.kind === "DIVIDER" && second.spawnEvents[0].tile.divisor, 2);
    assert.equal(session.moveCount, 2);
});
test("initialization preserves at least four empty cells", () => {
    for (let seed = 0; seed < 20; seed += 1) {
        let x = seed + 1;
        const random = () => ((x = (x * 48271) % 2147483647) / 2147483647);
        const state = initializeBoard(NORMAL_PRESET, random);
        assert.ok(state.cells.filter(cell => cell.kind === "EMPTY").length >= 4);
    }
});
test("divider survives save/restore and moves when no number hits it", () => {
    const state = boardFromRows([["÷4", null], [8, 16]]);
    const restored = restoreBoard(serializeBoard(state));
    assert.deepEqual(boardToRows(restored), [["÷4", null], [8, 16]]);
    const moved = executeMove(restored, "right");
    assert.deepEqual(boardToRows(moved.state)[0], [null, "÷4"]);
    assert.equal(moved.dividerEvents.length, 0);
    assert.equal(moved.mergeEvents.length, 0);
});
test("finite-mode victory ignores every remaining operator kind", () => {
    const state = boardFromRows([["÷2", "×2"], ["√", "饼干"]]);
    const session = new GameSession({ ...NORMAL_PRESET, boardSize: 2, initialTileCount: 0 }, () => 0, undefined, state);
    assert.equal(session.status(), "victory");
});
test("equal dividers merge once into the next divisor and never split", () => {
    const result = noSpawn([["÷2", "÷2", "÷2", "÷2"], [8, 16, 32, 64], [128, 256, 512, 1024], [2048, 4096, 8192, 16384]], "left");
    assert.deepEqual(boardToRows(result.state)[0], ["÷4", "÷4", null, null]);
    assert.equal(result.splitEvents.length, 0);
    assert.equal(result.mergeEvents.length, 0);
    assert.equal(result.dividerMergeEvents.length, 2);
    assert.deepEqual(result.dividerMergeEvents.map(event => event.resultDivisor), [4, 4]);
});
test("unequal dividers do not merge", () => {
    const result = noSpawn([["÷2", "÷4"], [8, 16]], "left");
    assert.deepEqual(boardToRows(result.state)[0], ["÷2", "÷4"]);
    assert.equal(result.dividerMergeEvents.length, 0);
});
test("4 _ ÷2 _ right -> _ _ 2 1 through a split-created tile", () => {
    const result = noSpawn([
        [4, null, "÷2", null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ], "right");
    assert.deepEqual(boardToRows(result.state)[0], [null, null, 2, 1]);
    assert.equal(result.splitEvents.length, 1);
    assert.equal(result.mergeEvents.length, 0);
    assert.equal(result.dividerEvents.length, 1);
    assert.equal(result.dividerEvents[0].tileId, result.splitEvents[0].createdTileId);
    assert.deepEqual(result.dividerEvents[0], {
        position: { row: 0, col: 2 }, divisor: 2, originalValue: 2, resultValue: 1,
        tileId: result.splitEvents[0].createdTileId, dividerTileId: 2,
    });
    assert.equal(result.state.cells.some(cell => cell.kind === "DIVIDER" && cell.id === 2), false);
});
test("divider integer division handles normal and disappearing results", () => {
    const cases = [[2, 2, 1], [4, 2, 2], [8, 4, 2], [1, 2, 0], [2, 4, 0]];
    cases.forEach(([value, divisor, expected]) => {
        const resolved = resolveDividerInteraction({ kind: "NUMBER", id: 10, value, createdBySplitThisMove: false }, { kind: "DIVIDER", id: 11, divisor }, { row: 0, col: 1 });
        assert.equal(resolved.event.resultValue, expected);
        assert.equal(resolved.tile?.value ?? 0, expected);
    });
});
test("a moving number cannot pass a divider without consuming it", () => {
    const result = noSpawn([[8, "÷4"], [16, 32]], "right");
    assert.deepEqual(boardToRows(result.state)[0], [null, 2]);
    assert.equal(result.dividerEvents.length, 1);
    assert.equal(result.state.cells.some(cell => cell.kind === "DIVIDER"), false);
});
test("divider is single-use even when its divisor is larger than the number", () => {
    const result = noSpawn([[2, "÷8"], [16, 32]], "right");
    assert.deepEqual(boardToRows(result.state)[0], [null, null]);
    assert.equal(result.dividerEvents.length, 1);
    assert.equal(result.dividerEvents[0].resultValue, 0);
    assert.equal(result.state.cells.some(cell => cell.kind === "DIVIDER"), false);
});
test("one divider triggers once and consecutive dividers resolve in route order", () => {
    const result = noSpawn([
        [8, "÷2", "÷2", 32],
        [64, 128, 256, 512],
        [1024, 2048, 4096, 8192],
        [16384, 32768, 65536, 131072],
    ], "right");
    assert.deepEqual(boardToRows(result.state)[0], [null, null, 2, 32]);
    assert.deepEqual(result.dividerEvents.map(event => event.position.col), [1, 2]);
    assert.deepEqual(result.dividerEvents.map(event => [event.originalValue, event.resultValue]), [[8, 4], [4, 2]]);
    assert.equal(new Set(result.dividerEvents.map(event => event.dividerTileId)).size, 2);
    assert.equal(result.dividerMergeEvents.length, 0);
});
test("vertical movement uses the same front-first split order", () => {
    const result = noSpawn([[2, null, null], [1, null, null], [null, null, null]], "down");
    assert.deepEqual(boardToRows(result.state).map(row => row[0]), [null, null, 2]);
    assert.equal(result.splitEvents.length, 1);
    assert.equal(result.splitEvents[0].originalValue, 1);
});
test("number sum never increases through split/merge/compress", () => {
    const state = boardFromRows([[8, 4, null, 2], [1, null, 2, 2], [4, 8, 16, null], [null, 1, 2, 4]]);
    const sum = (value) => value.cells.reduce((total, cell) => total + (cell.kind === "NUMBER" ? cell.value : 0), 0);
    const before = sum(state);
    const result = executeMove(state, "right");
    assert.equal(sum(result.state), before - result.splitEvents.filter(event => event.originalValue === 1).length);
});
test("undo restores a consumed divider, score and move count", () => {
    const initial = boardFromRows([[8, "÷2"], [8, 16]]);
    const preset = { ...NORMAL_PRESET, boardSize: 2, initialTileCount: 0, minInitialEmptyCells: 0, allowedDivisors: [2] };
    const session = new GameSession(preset, () => 0, undefined, initial);
    const result = session.move("right");
    assert.equal(result.dividerEvents.length, 1);
    assert.equal(session.score, 0);
    assert.equal(session.moveCount, 1);
    assert.equal(session.undo(), true);
    assert.deepEqual(boardToRows(session.state), [[8, "÷2"], [8, 16]]);
    assert.equal(session.score, 0);
    assert.equal(session.moveCount, 0);
});
test("multiplier is single-use and equal multipliers merge once", () => {
    const triggered = noSpawn([[8, "×2"], [16, 32]], "right");
    assert.deepEqual(boardToRows(triggered.state)[0], [null, 16]);
    assert.equal(triggered.multiplierEvents.length, 1);
    assert.equal(triggered.state.cells.some(cell => cell.kind === "MULTIPLIER"), false);
    const horizontal = noSpawn([["×2", "×2", "×2", "×2"], [null, null, null, null], [null, null, null, null], [null, null, null, null]], "left");
    assert.deepEqual(boardToRows(horizontal.state)[0], ["×4", "×4", null, null]);
    assert.equal(horizontal.multiplierMergeEvents.length, 2);
});
test("root rounds down to the greatest power of two not above the square root", () => {
    assert.equal(floorPowerOfTwo(Math.sqrt(32)), 4);
    assert.equal(floorPowerOfTwo(Math.sqrt(256)), 16);
    const moving = { kind: "NUMBER", id: 7, value: 32, createdBySplitThisMove: false };
    const resolved = resolveRootInteraction(moving, { kind: "ROOT", id: 8 }, { row: 0, col: 1 });
    assert.equal(resolved.tile.value, 4);
    const result = noSpawn([[32, "√"], [64, 128]], "right");
    assert.deepEqual(boardToRows(result.state)[0], [null, 4]);
    assert.equal(result.rootEvents.length, 1);
    assert.equal(result.state.cells.some(cell => cell.kind === "ROOT"), false);
});
test("mixed operators trigger nearest-first along the number route", () => {
    const result = noSpawn([
        [16, "×2", "√", "÷2"],
        [64, 128, 256, 512],
        [1024, 2048, 4096, 8192],
        [16384, 32768, 65536, 131072],
    ], "right");
    assert.deepEqual(boardToRows(result.state)[0], [null, null, null, 2]);
    assert.deepEqual(result.multiplierEvents.map(event => [event.originalValue, event.resultValue]), [[16, 32]]);
    assert.deepEqual(result.rootEvents.map(event => [event.originalValue, event.resultValue]), [[32, 4]]);
    assert.deepEqual(result.dividerEvents.map(event => [event.originalValue, event.resultValue]), [[4, 2]]);
});
test("cookie expires after one swipe and only a fresh split tile is blocked", () => {
    const result = noSpawn([
        [4, "饼干", null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ], "right");
    assert.deepEqual(boardToRows(result.state)[0], [2, null, null, 2]);
    assert.equal(result.cookieEvents.length, 1);
    assert.equal(result.cookieEvents[0].triggered, true);
    assert.equal(result.state.cells.some(cell => cell.kind === "COOKIE"), false);
    const ordinary = noSpawn([[8, "饼干"], [16, 32]], "right");
    assert.deepEqual(boardToRows(ordinary.state)[0], [null, 8]);
    assert.equal(ordinary.cookieEvents[0].triggered, false);
});
test("cookie bonus starts on the next move, lasts three effective swipes, and undo restores it", () => {
    const initial = boardFromRows([
        [4, "饼干", null, null],
        [8, null, null, null],
        [16, null, null, null],
        [32, null, null, null],
    ]);
    const session = new GameSession({ ...NORMAL_PRESET, initialTileCount: 0 }, () => 0, undefined, initial, { generationRules: { kind: "NONE" } });
    const activation = session.move("right");
    assert.equal(activation.scoreMultiplier, 1);
    assert.equal(session.scoreMultiplierMovesRemaining, 3);
    const doubled = session.move("left");
    assert.equal(doubled.scoreMultiplier, 2);
    assert.equal(session.scoreMultiplierMovesRemaining, 2);
    assert.equal(session.undo(), true);
    assert.equal(session.scoreMultiplierMovesRemaining, 3);
    const replay = session.move("left");
    assert.equal(replay.scoreMultiplier, 2);
});
test("direct multiplier and root resolver APIs preserve tile identity", () => {
    const moving = { kind: "NUMBER", id: 10, value: 8, createdBySplitThisMove: false };
    const multiplied = resolveMultiplierInteraction(moving, { kind: "MULTIPLIER", id: 11, factor: 4 }, { row: 0, col: 1 });
    assert.equal(multiplied.tile.id, 10);
    assert.equal(multiplied.tile.value, 32);
    const rooted = resolveRootInteraction(multiplied.tile, { kind: "ROOT", id: 12 }, { row: 0, col: 2 });
    assert.equal(rooted.tile.id, 10);
    assert.equal(rooted.tile.value, 4);
});
