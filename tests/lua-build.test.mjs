import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const initLua = fs.readFileSync(new URL("../init.lua", import.meta.url), "utf8");
const coreLua = fs.readFileSync(new URL("../Script/Core.lua", import.meta.url), "utf8");
const configLua = fs.readFileSync(new URL("../Script/Config.lua", import.meta.url), "utf8");
const tutorialLua = fs.readFileSync(new URL("../Script/Tutorial.lua", import.meta.url), "utf8");
const tsconfig = JSON.parse(fs.readFileSync(new URL("../tsconfig.json", import.meta.url), "utf8"));

test("compiled rule and difficulty callbacks receive TSTL thisArg before data", () => {
  assert.match(initLua, /function\(____, preset, index\)/);
  assert.match(initLua, /function\(____, section\)/);
});

test("compiled preset validation receives the array value rather than thisArg", () => {
  assert.match(coreLua, /preset\.initialValues,[\s\S]*?function\(____, value\) return not __TS__NumberIsInteger\(value\)/);
});

test("Lua build keeps Dora external and uses compatible implicit-self semantics", () => {
  assert.equal(tsconfig.tstl.noImplicitSelf, false);
  assert.deepEqual(tsconfig.tstl.noResolvePaths, ["Dora"]);
  assert.match(initLua, /require\("Dora"\)/);
  assert.doesNotMatch(initLua, /require\("API\.Dora_d"\)/);
});

test("compiled Lua contains progressive endless pools and exact difficulty decks", () => {
  assert.match(coreLua, /endlessNumberPoolForMove/);
  assert.match(coreLua, /preset\.endlessNumberStages/);
  assert.match(configLua, /fromMove = 400/);
  assert.match(configLua, /operatorSpawnInterval = 2/);
  assert.match(coreLua, /spawnEndlessTile/);
  assert.match(coreLua, /scoreMultiplierMovesRemaining/);
  assert.match(tutorialLua, /targetMoves = 60/);
  assert.match(initLua, /总和/);
});
