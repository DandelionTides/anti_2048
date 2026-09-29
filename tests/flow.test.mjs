import assert from "node:assert/strict";
import test from "node:test";
import { DIFFICULTY_PRESETS, ENDLESS_PRESET, NORMAL_PRESET } from "../Script/Config.ts";
import { GameSession, endlessNumberPoolForMove, hasAnyLegalMove, initializeBoard, spawnEndlessTile } from "../Script/Core.ts";
import { GameTimer, formatTime } from "../Script/GameTimer.ts";
import { SaveRepository, SAVE_VERSION } from "../Script/SaveData.ts";
import { boardFromRows, boardToRows } from "./TestBoard.mjs";
import { TUTORIAL_LEVELS, createTutorialBoard } from "../Script/Tutorial.ts";
test("ScoreManager awards original split value and never awards merges", () => {
    const splitState = boardFromRows([[8, null], [2, 4]]);
    const splitSession = new GameSession({ ...NORMAL_PRESET, boardSize: 2, initialTileCount: 0, minInitialEmptyCells: 0 }, () => 0, undefined, splitState);
    const split = splitSession.move("left");
    assert.equal(split.scoreDelta, 8);
    assert.equal(splitSession.score, 8);
    const mergeState = boardFromRows([[2, 2], [8, 16]]);
    const mergeSession = new GameSession({ ...NORMAL_PRESET, boardSize: 2, initialTileCount: 0, minInitialEmptyCells: 0 }, () => 0, undefined, mergeState);
    const merge = mergeSession.move("left");
    assert.equal(merge.mergeEvents.length, 1);
    assert.equal(merge.scoreDelta, 0);
    assert.equal(mergeSession.score, 0);
});
test("endless mode spawns exactly one randomly selected tile per effective move", () => {
    const initial = boardFromRows([[64, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    const values = [0.1, 0, 0, 0.9, 0, 0, 0];
    const random = () => values.shift() ?? 0;
    const session = new GameSession({ ...ENDLESS_PRESET, initialTileCount: 0, allowedDivisors: [4], operatorPool: ["DIVIDER"], endlessNumberStages: [{ fromMove: 1, values: [2] }] }, random, undefined, initial, { mode: "endless" });
    const first = session.move("right");
    assert.equal(first.spawnEvents.length, 1);
    assert.equal(first.spawnEvents[0].tile.kind, "NUMBER");
    const second = session.move("left");
    assert.equal(second.spawnEvents.length, 1);
    assert.equal(second.spawnEvents[0].tile.kind, "DIVIDER");
});
test("with one post-move empty endless mode still creates at most one tile", () => {
    const initial = boardFromRows([[2, 2], [8, 16]]);
    const session = new GameSession({ ...ENDLESS_PRESET, boardSize: 2, initialTileCount: 0, minInitialEmptyCells: 0, allowedDivisors: [2], endlessNumberStages: [{ fromMove: 1, values: [1] }] }, () => 0, undefined, initial, { mode: "endless" });
    session.moveCount = 1;
    const result = session.move("left");
    assert.equal(result.spawnEvents.length, 1);
    assert.equal(result.spawnEvents[0].tile.kind, "NUMBER");
    assert.equal(result.state.cells.filter(cell => cell.kind === "EMPTY").length, 0);
});
test("Game Over checks legal movement and merging rather than only fullness", () => {
    assert.equal(hasAnyLegalMove(boardFromRows([[2, 2], [8, 16]])), true);
    assert.equal(hasAnyLegalMove(boardFromRows([["÷2", "÷2"], [8, 16]])), true);
    assert.equal(hasAnyLegalMove(boardFromRows([[2, 4], [8, 16]])), false);
});
test("undo restores the exact pre-spawn board without changing elapsed time", () => {
    const initial = boardFromRows([[1, null], [8, 16]]);
    const session = new GameSession({ ...NORMAL_PRESET, boardSize: 2, initialTileCount: 0, minInitialEmptyCells: 0 }, () => 0, undefined, initial);
    const timer = new GameTimer(true);
    timer.start();
    timer.update(3.25);
    session.move("right");
    const timeBeforeUndo = timer.milliseconds;
    assert.equal(session.undo(), true);
    assert.deepEqual(boardToRows(session.state), [[1, null], [8, 16]]);
    assert.equal(timer.milliseconds, timeBeforeUndo);
});
test("undo restores divider spawn cadence", () => {
    const initial = boardFromRows([
        [64, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ]);
    const session = new GameSession({ ...NORMAL_PRESET, initialTileCount: 0, allowedDivisors: [2] }, () => 0, undefined, initial);
    session.move("right");
    const second = session.move("left");
    assert.equal(second.spawnEvents[0].tile.kind, "DIVIDER");
    assert.equal(session.moveCount, 2);
    assert.equal(session.undo(), true);
    assert.equal(session.moveCount, 1);
    assert.equal(session.state.cells.some(cell => cell.kind === "DIVIDER"), false);
    const replay = session.move("left");
    assert.equal(replay.spawnEvents[0].tile.kind, "DIVIDER");
});
test("timer excludes paused time and formatter uses hours minutes seconds", () => {
    const timer = new GameTimer(true);
    timer.start();
    timer.update(1.234);
    timer.pause();
    timer.update(5);
    timer.resume();
    timer.update(0.006);
    assert.equal(timer.milliseconds, 1240);
    assert.equal(formatTime(timer.milliseconds), "00:00:01");
    assert.equal(formatTime(3661999), "01:01:01");
    const disabled = new GameTimer(false);
    disabled.start();
    disabled.update(10);
    assert.equal(disabled.milliseconds, 0);
});
test("save data persists volume and records with saveVersion", () => {
    let memory;
    const port = { load: () => memory, save: (content) => { memory = content; return true; } };
    const repository = new SaveRepository(port);
    repository.setVolume(0.35);
    repository.recordEndless(120, 64);
    repository.recordDifficulty(DIFFICULTY_PRESETS[1], 80, 5432);
    const reloaded = new SaveRepository(port);
    assert.equal(reloaded.data.saveVersion, SAVE_VERSION);
    assert.equal(reloaded.data.volume, 0.35);
    assert.equal(reloaded.data.endlessBestScore, 120);
    assert.equal(reloaded.data.endlessHighestNumber, 64);
    assert.equal(reloaded.data.difficultyRecords.normal.bestScore, 80);
    assert.equal(reloaded.data.difficultyRecords.normal.bestTimeMs, 5432);
});
test("all three difficulty presets expose required independent configuration", () => {
    assert.deepEqual(DIFFICULTY_PRESETS.map(preset => preset.id), ["easy", "normal", "hard"]);
    for (const preset of DIFFICULTY_PRESETS) {
        assert.ok(preset.initialTileCount > 0);
        assert.ok(preset.initialValues.length > 0);
        assert.ok(preset.allowedDivisors.length > 0);
        assert.equal(preset.operatorSpawnInterval, 2);
        assert.ok(preset.allowedMultipliers.length > 0);
        assert.ok(preset.operatorPool.includes("MULTIPLIER"));
        assert.equal(typeof preset.defaultTimed, "boolean");
        assert.equal(preset.targetRule, "CLEAR_ALL_NUMBERS");
    }
});
test("difficulty initialization uses the configured larger exact totals", () => {
    const expectedTotals = [64, 128, 256];
    DIFFICULTY_PRESETS.forEach((preset, presetIndex) => {
        for (let seed = 1; seed <= 8; seed += 1) {
            let value = seed;
            const random = () => ((value = (value * 48271) % 2147483647) / 2147483647);
            const state = initializeBoard(preset, random);
            const numbers = state.cells.filter(cell => cell.kind === "NUMBER");
            assert.equal(numbers.length, preset.initialTileCount);
            assert.equal(numbers.reduce((sum, cell) => sum + (cell.kind === "NUMBER" ? cell.value : 0), 0), expectedTotals[presetIndex]);
            assert.ok(state.cells.filter(cell => cell.kind === "EMPTY").length >= 4);
        }
    });
});
test("endless number stages increase both maximum value and top-value probability", () => {
    const moves = [1, 30, 70, 120, 190, 280, 400];
    let previousMaximum = 0;
    let previousTopChance = 0;
    moves.forEach(move => {
        const pool = endlessNumberPoolForMove(ENDLESS_PRESET, move);
        const maximum = Math.max(...pool);
        const topChance = pool.filter(value => value === maximum).length / pool.length;
        assert.ok(maximum > previousMaximum);
        assert.ok(topChance > previousTopChance);
        previousMaximum = maximum;
        previousTopChance = topChance;
    });
    assert.deepEqual(endlessNumberPoolForMove(ENDLESS_PRESET, 69), ENDLESS_PRESET.endlessNumberStages[1].values);
});
test("endless operator values remain fixed at late move counts", () => {
    const early = boardFromRows([[64, null], [null, null]]);
    const late = boardFromRows([[64, null], [null, null]]);
    const earlySpawn = spawnEndlessTile(early, { ...ENDLESS_PRESET, boardSize: 2, operatorPool: ["MULTIPLIER"], allowedMultipliers: [2] }, 1, ["MULTIPLIER"], 0, () => 0);
    const lateSpawn = spawnEndlessTile(late, { ...ENDLESS_PRESET, boardSize: 2, operatorPool: ["MULTIPLIER"], allowedMultipliers: [2] }, 999, ["MULTIPLIER"], 0, () => 0);
    assert.equal(earlySpawn?.tile.kind === "MULTIPLIER" && earlySpawn.tile.factor, 2);
    assert.equal(lateSpawn?.tile.kind === "MULTIPLIER" && lateSpawn.tile.factor, 2);
});
test("tutorial sequence gates operators and ends with a 60-move endless lesson", () => {
    assert.equal(TUTORIAL_LEVELS.length, 7);
    for (let index = 0; index < 5; index += 1) assert.equal(TUTORIAL_LEVELS[index].allowedOperators.includes("COOKIE"), false);
    assert.equal(TUTORIAL_LEVELS[5].allowedOperators.includes("COOKIE"), true);
    assert.equal(TUTORIAL_LEVELS[2].allowedOperators.every(kind => kind === "DIVIDER"), true);
    assert.deepEqual(TUTORIAL_LEVELS[3].allowedOperators, ["DIVIDER", "MULTIPLIER"]);
    assert.deepEqual(TUTORIAL_LEVELS[4].allowedOperators, ["MULTIPLIER", "ROOT"]);
    for (let index = 0; index < 6; index += 1) {
        assert.equal(TUTORIAL_LEVELS[index].goal.clearNumbers, true);
        assert.equal(TUTORIAL_LEVELS[index].goal.targetMoves, undefined);
        assert.equal(TUTORIAL_LEVELS[index].barrageMessages.length, 6);
    }
    assert.equal(TUTORIAL_LEVELS[6].barrageMessages.length, 6);
    assert.equal(TUTORIAL_LEVELS[1].generationRules.operatorSequence.length, 6);
    for (let index = 1; index < 6; index += 1) {
        assert.ok((TUTORIAL_LEVELS[index].generationRules.operatorSequence?.length ?? 0) >= 3);
    }
    assert.equal(TUTORIAL_LEVELS[6].generationRules.kind, "ENDLESS");
    assert.equal(TUTORIAL_LEVELS[6].goal.targetMoves, 60);
    assert.equal(createTutorialBoard(TUTORIAL_LEVELS[1]).cells.filter(cell => cell.kind !== "EMPTY").length, 6);
});
test("priority and cookie tutorials add a finite process and finish with no numbers", () => {
    const priority = TUTORIAL_LEVELS[1];
    const prioritySession = new GameSession(ENDLESS_PRESET, () => 0, undefined, createTutorialBoard(priority), {
        mode: "tutorial", generationRules: priority.generationRules, tutorialGoal: priority.goal,
    });
    const prioritySpawns = [];
    for (const direction of ["right", "up", "left", "right", "left"]) {
        prioritySpawns.push(...prioritySession.move(direction).spawnEvents.map(event => event.tile.kind));
    }
    assert.ok(prioritySpawns.length >= 3);
    assert.deepEqual(prioritySpawns.slice(0, 3), ["DIVIDER", "MULTIPLIER", "ROOT"]);
    assert.equal(prioritySession.status(), "victory");
    assert.equal(prioritySession.state.cells.some(cell => cell.kind === "NUMBER"), false);

    const cookie = TUTORIAL_LEVELS[5];
    const cookieSession = new GameSession(ENDLESS_PRESET, () => 0, undefined, createTutorialBoard(cookie), {
        mode: "tutorial", generationRules: cookie.generationRules, tutorialGoal: cookie.goal,
    });
    const firstCookieMove = cookieSession.move("right");
    assert.equal(firstCookieMove.cookieEvents.some(event => event.triggered), true);
    assert.equal(cookieSession.scoreMultiplierMovesRemaining, 3);
    cookieSession.move("right");
    assert.equal(cookieSession.tutorialProgress.doubledMoves, 1);
    assert.equal(cookieSession.status(), "playing");
    cookieSession.move("down");
    cookieSession.move("down");
    cookieSession.move("right");
    assert.equal(cookieSession.tutorialProgress.doubledMoves, 3);
    assert.equal(cookieSession.status(), "victory");
    assert.equal(cookieSession.state.cells.some(cell => cell.kind === "NUMBER"), false);
});
test("the first six tutorials are completable by eliminating every number", () => {
    const solutions = [
        ["right", "right", "down", "down"],
        ["right", "up", "left", "right", "left"],
        ["right", "right", "down", "down", "left"],
        ["right", "left", "up", "up", "right", "left"],
        ["right", "up", "up", "left", "left", "left", "left", "right"],
        ["right", "right", "down", "down", "right"],
    ];
    for (let levelIndex = 0; levelIndex < solutions.length; levelIndex += 1) {
        const level = TUTORIAL_LEVELS[levelIndex];
        const tutorial = new GameSession(ENDLESS_PRESET, () => 0, undefined, createTutorialBoard(level), {
            mode: "tutorial", generationRules: level.generationRules, tutorialGoal: level.goal,
        });
        for (const direction of solutions[levelIndex]) {
            if (tutorial.runStatus !== "playing") break;
            tutorial.move(direction);
        }
        assert.equal(tutorial.status(), "victory", `tutorial ${level.id} should be completable`);
        assert.equal(tutorial.state.cells.some(cell => cell.kind === "NUMBER"), false);
        assert.ok(tutorial.moveCount <= solutions[levelIndex].length);
    }
});
test("finite tutorial wins when the last number disappears beside a multiplier", () => {
    const state = boardFromRows([[1, "×2"], [null, null]]);
    const tutorial = new GameSession({ ...ENDLESS_PRESET, boardSize: 2, initialTileCount: 0 }, () => 0, undefined, state, {
        mode: "tutorial", generationRules: { kind: "NONE" }, tutorialGoal: { clearNumbers: true },
    });
    tutorial.move("down");
    assert.equal(tutorial.state.cells.some(cell => cell.kind === "MULTIPLIER"), true);
    assert.equal(tutorial.state.cells.some(cell => cell.kind === "NUMBER"), false);
    assert.equal(tutorial.status(), "victory");
});
test("undo history respects its configured finite limit", () => {
    const initial = boardFromRows([
        [64, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
    ]);
    const session = new GameSession({ ...NORMAL_PRESET, initialTileCount: 0 }, () => 0, undefined, initial, { maxHistory: 2 });
    session.move("right");
    session.move("left");
    session.move("down");
    assert.equal(session.history.length, 2);
});
