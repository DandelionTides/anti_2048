import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tsSource = readFileSync(new URL("../init.ts", import.meta.url), "utf8");
const luaSource = readFileSync(new URL("../init.lua", import.meta.url), "utf8");

function anchoredChildWorld(nodeCenter, nodeSize, anchor, childLocal) {
  return nodeCenter - nodeSize * anchor + childLocal;
}

test("centered Dora hit nodes paint their children at the same center", () => {
  for (const size of [60, 64, 86, 100, 130, 470, 520]) {
    const paintedCenter = anchoredChildWorld(123, size, 0.5, size / 2);
    assert.equal(paintedCenter, 123);
  }
});

test("legacy child origin demonstrates the exact half-size visual offset", () => {
  assert.equal(anchoredChildWorld(0, 720, 0.5, 0), -360);
  assert.equal(anchoredChildWorld(0, 1280, 0.5, 0), -640);
  assert.equal(anchoredChildWorld(0, 470, 0.5, 0), -235);
  assert.equal(anchoredChildWorld(0, 86, 0.5, 0), -43);
});

test("TypeScript root is sizeless and button visuals use node content center", () => {
  assert.match(tsSource, /root\.anchor = Vec2\.zero/);
  assert.doesNotMatch(tsSource, /root\.size\s*=/);
  assert.match(tsSource, /face\.position = Vec2\(contentX, contentY\)/);
  assert.match(tsSource, /addText\(button, text, options\.fontSize \?\? 30, contentX, contentY/);
});

test("runtime Lua contains the same root and button coordinate fix", () => {
  assert.match(luaSource, /root\.anchor = Vec2\.zero/);
  assert.doesNotMatch(luaSource, /root\.size\s*=/);
  assert.match(luaSource, /face\.position = Vec2\(contentX, contentY\)/);
  assert.match(luaSource, /track\.position = Vec2\(sliderWidth \/ 2, trackY\)/);
});

test("rules clipping and dragging do not share an anchored content node", () => {
  assert.doesNotMatch(tsSource, /viewport\.size\s*=/);
  assert.doesNotMatch(tsSource, /viewport\.anchor\s*=/);
  assert.match(tsSource, /dragSurface\.size = Size\(660, viewportHeight\)/);
  assert.match(tsSource, /dragSurface\.anchor = Vec2\(0\.5, 0\.5\)/);
});

test("volume slider maps Dora local content coordinates from 20 through 500", () => {
  const sliderWidth = 520;
  const trackWidth = 480;
  const trackLeft = (sliderWidth - trackWidth) / 2;
  const volumeAt = x => Math.max(0, Math.min(1, (x - trackLeft) / trackWidth));
  assert.equal(trackLeft, 20);
  assert.equal(volumeAt(20), 0);
  assert.equal(volumeAt(260), 0.5);
  assert.equal(volumeAt(500), 1);
});

test("all seven tutorial buttons and descriptions stay inside the portrait canvas", () => {
  const items = Array.from({ length: 7 }, (_, index) => ({
    buttonY: 360 - index * 125,
    descriptionY: 360 - index * 125 - 50,
  }));
  for (const item of items) {
    assert.ok(item.buttonY + 37 <= 640);
    assert.ok(item.buttonY - 37 >= -640);
    assert.ok(item.descriptionY >= -640);
  }
  assert.match(tsSource, /go\("TUTORIAL_SELECT"\)/);
  assert.match(luaSource, /screens\.current == "TUTORIAL_SELECT"/);
});

test("tutorial guidance uses one fixed large fading card and no extra tutorial HUD", () => {
  assert.match(tsSource, /addText\(card, text, 30/);
  assert.match(tsSource, /card\.position = Vec2\(0, 350\)/);
  assert.match(tsSource, /const fadeIn = 0\.45/);
  assert.match(tsSource, /const hold = 4\.0/);
  assert.match(tsSource, /const fadeOut = 0\.75/);
  assert.match(tsSource, /sleep\(5\.35\)/);
  assert.match(tsSource, /Opacity\(fadeIn, 0, 1, Ease\.OutQuad\)/);
  assert.match(tsSource, /Delay\(hold\)/);
  assert.match(tsSource, /Opacity\(fadeOut, 1, 0, Ease\.OutQuad\)/);
  assert.doesNotMatch(tsSource, /Move\(duration, start, end, Ease\.Linear\)/);
  assert.match(tsSource, /playTutorialBarrage\(level\.barrageMessages\)/);
  assert.doesNotMatch(tsSource, /"重播提示"/);
  assert.doesNotMatch(tsSource, /`目标：\$\{activeTutorial\.objective\}`/);
  assert.doesNotMatch(tsSource, /教学进度/);
  assert.doesNotMatch(tsSource, /tutorialMoveMessage/);
  assert.match(tsSource, /level\.shortDescription, 20/);
  assert.doesNotMatch(tsSource, /activeTutorial\.lesson/);
  assert.match(luaSource, /card\.position = Vec2\(0, 350\)/);
  assert.match(luaSource, /Opacity\(fadeIn, 0, 1, Ease\.OutQuad\)/);
});
