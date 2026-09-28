import assert from "node:assert/strict";
import test from "node:test";
import {
  DESIGN_HEIGHT, DESIGN_WIDTH, designToView, fitPortraitCanvas, viewToDesign,
} from "../Script/Layout.ts";
import { integerText } from "../Script/Display.ts";

const phones = [
  { name: "small Android", width: 320, height: 568, top: 0, bottom: 0 },
  { name: "16:9", width: 360, height: 640, top: 0, bottom: 0 },
  { name: "iPhone 15", width: 393, height: 852, top: 59, bottom: 34 },
  { name: "iPhone Pro Max", width: 430, height: 932, top: 62, bottom: 34 },
  { name: "tall Android", width: 412, height: 915, top: 32, bottom: 24 },
  { name: "tablet portrait", width: 768, height: 1024, top: 24, bottom: 20 },
  { name: "landscape debug", width: 1920, height: 1080, top: 0, bottom: 0 },
];

for (const phone of phones) {
  test(`fixed canvas fits the safe area on ${phone.name}`, () => {
    const safeHeight = phone.height - phone.top - phone.bottom;
    const fit = fitPortraitCanvas({
      viewWidth: phone.width,
      viewHeight: phone.height,
      visualWidth: phone.width,
      visualHeight: phone.height,
      safeX: 0,
      safeY: phone.bottom,
      safeWidth: phone.width,
      safeHeight,
    });
    assert.ok(DESIGN_WIDTH * fit.scale <= phone.width + 0.001);
    assert.ok(DESIGN_HEIGHT * fit.scale <= safeHeight + 0.001);
    assert.ok(fit.backgroundScale >= 1);
    const centerX = phone.width / 2 + fit.rootX;
    const centerY = phone.height / 2 + fit.rootY;
    assert.ok(centerX - DESIGN_WIDTH * fit.scale / 2 >= -0.001);
    assert.ok(centerX + DESIGN_WIDTH * fit.scale / 2 <= phone.width + 0.001);
    assert.ok(centerY - DESIGN_HEIGHT * fit.scale / 2 >= phone.bottom - 0.001);
    assert.ok(centerY + DESIGN_HEIGHT * fit.scale / 2 <= phone.height - phone.top + 0.001);
  });
}

test("high-DPI view and logical screen produce the same fixed-canvas fit", () => {
  const logical = fitPortraitCanvas({ viewWidth: 390, viewHeight: 844, visualWidth: 390, visualHeight: 844, safeX: 0, safeY: 34, safeWidth: 390, safeHeight: 763 });
  const retina = fitPortraitCanvas({ viewWidth: 1170, viewHeight: 2532, visualWidth: 390, visualHeight: 844, safeX: 0, safeY: 34, safeWidth: 390, safeHeight: 763 });
  assert.equal(retina.scale, logical.scale * 3);
  assert.equal(retina.rootX, logical.rootX * 3);
  assert.equal(retina.rootY, logical.rootY * 3);
});

test("UI coordinates and touch coordinates use an exact round trip", () => {
  const fit = fitPortraitCanvas({ viewWidth: 1179, viewHeight: 2556, visualWidth: 393, visualHeight: 852, safeX: 0, safeY: 34, safeWidth: 393, safeHeight: 759 });
  for (const point of [{ x: 0, y: 0 }, { x: -320, y: 540 }, { x: 285, y: 540 }, { x: 319, y: -374 }]) {
    const restored = viewToDesign(designToView(point, fit), fit);
    assert.ok(Math.abs(restored.x - point.x) < 0.000001);
    assert.ok(Math.abs(restored.y - point.y) < 0.000001);
  }
});

const importantRects = [
  { name: "main settings", x: 255, y: 525, width: 170, height: 64 },
  { name: "main start", x: 0, y: 65, width: 470, height: 86 },
  { name: "main rules", x: 0, y: -55, width: 470, height: 86 },
  { name: "header back", x: -255, y: 530, width: 150, height: 64 },
  { name: "mode difficulty", x: 0, y: 145, width: 470, height: 86 },
  { name: "mode endless", x: 0, y: -85, width: 470, height: 86 },
  { name: "difficulty easy", x: 0, y: 240, width: 470, height: 86 },
  { name: "difficulty normal", x: 0, y: 50, width: 470, height: 86 },
  { name: "difficulty hard", x: 0, y: -140, width: 470, height: 86 },
  { name: "timer timed", x: 0, y: 100, width: 470, height: 86 },
  { name: "timer untimed", x: 0, y: -30, width: 470, height: 86 },
  { name: "rules viewport", x: 0, y: -35, width: 660, height: 900 },
  { name: "settings panel", x: 0, y: 130, width: 610, height: 260 },
  { name: "playing undo", x: 150, y: 540, width: 130, height: 60 },
  { name: "playing pause", x: 285, y: 540, width: 120, height: 60 },
  { name: "board", x: 0, y: -55, width: 640, height: 640 },
  { name: "pause resume", x: 0, y: 100, width: 470, height: 86 },
  { name: "pause rules", x: 0, y: -20, width: 470, height: 86 },
  { name: "pause menu", x: 0, y: -140, width: 470, height: 86 },
  { name: "outcome restart", x: 0, y: -160, width: 470, height: 86 },
  { name: "outcome menu", x: 0, y: -270, width: 470, height: 86 },
];

test("all critical visuals and hit targets stay inside the portrait canvas", () => {
  for (const rect of importantRects) {
    assert.ok(rect.x - rect.width / 2 >= -DESIGN_WIDTH / 2, `${rect.name} left`);
    assert.ok(rect.x + rect.width / 2 <= DESIGN_WIDTH / 2, `${rect.name} right`);
    assert.ok(rect.y - rect.height / 2 >= -DESIGN_HEIGHT / 2, `${rect.name} bottom`);
    assert.ok(rect.y + rect.height / 2 <= DESIGN_HEIGHT / 2, `${rect.name} top`);
  }
});

test("HUD touch targets do not overlap", () => {
  const undo = importantRects.find(rect => rect.name === "playing undo");
  const pause = importantRects.find(rect => rect.name === "playing pause");
  assert.ok(undo.x + undo.width / 2 <= pause.x - pause.width / 2);
});

test("the reported 1078 x 718 landscape viewport keeps the portrait UI centered", () => {
  const width = 1078;
  const height = 718;
  const fit = fitPortraitCanvas({
    viewWidth: width,
    viewHeight: height,
    visualWidth: width,
    visualHeight: height,
    safeX: 0,
    safeY: 0,
    safeWidth: width,
    safeHeight: height,
  });
  const toScreen = point => {
    const viewPoint = designToView(point, fit);
    return { x: width / 2 + viewPoint.x, y: height / 2 + viewPoint.y };
  };
  const title = toScreen({ x: 0, y: 330 });
  const start = toScreen({ x: 0, y: 65 });
  const settings = toScreen({ x: 255, y: 525 });
  assert.ok(Math.abs(title.x - width / 2) < 0.001);
  assert.ok(Math.abs(start.x - width / 2) < 0.001);
  assert.ok(settings.x > width / 2);
  assert.ok(settings.y > title.y);
  assert.ok(start.y > 0 && start.y < height);
});

test("integer tile formatter never exposes Lua-style decimal suffixes", () => {
  assert.equal(integerText(1), "1");
  assert.equal(integerText(2.9), "2");
  assert.equal(integerText(2048), "2048");
});
