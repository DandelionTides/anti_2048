import {
  App, ClipNode, Color, Content, Director, DrawNode, Ease, Label, LoveNode, Move,
  KeyName, Node, Opacity, Scale, Spawn, Size, TextAlign, Vec2, View, sleep,
} from "Dora";
import type { Cell, Direction, MoveResult, NumberTile, Position } from "Script/Core";
import { GameSession } from "Script/Core";
import type { DifficultyPreset, GameMode } from "Script/Config";
import { DIFFICULTY_PRESETS, ENDLESS_PRESET } from "Script/Config";
import { GameTimer, formatTime } from "Script/GameTimer";
import { RULE_SECTIONS } from "Script/RuleContent";
import { SaveRepository } from "Script/SaveData";
import type { StoragePort } from "Script/SaveData";
import type { ScreenState } from "Script/StateMachine";
import { ScreenStateMachine } from "Script/StateMachine";
import { doraRandom } from "Script/Random";
import { AudioManager } from "Script/AudioManager";
import { integerText } from "Script/Display";
import { DESIGN_HEIGHT, DESIGN_WIDTH, fitPortraitCanvas } from "Script/Layout";

const BOARD_WIDTH = 640;
const BOARD_CENTER_Y = -55;
const CELL_GAP = 12;
const SWIPE_THRESHOLD = 44;
const ANIMATION_TIME = 0.18;
const FONT = "sarasa-mono-sc-regular";
const SAVE_FILE = `${Content.writablePath}/anti-2048-save-v2.json`;

const COLORS = {
  ink: Color(0xff243047), muted: Color(0xff6f7c91), panel: Color(0xfff5f7fb),
  board: Color(0xffdfe6f1), slot: Color(0xffedf1f7), primary: Color(0xff4f8fe8),
  secondary: Color(0xff90a7c7), danger: Color(0xffe47c86), divider: Color(0xff7656d6),
  dividerInner: Color(0xffbdaef0), white: Color(0xffffffff),
};
Director.clearColor = Color(0xfff5f9fe);

const storage: StoragePort = {
  load: () => (Content.exist(SAVE_FILE) ? Content.load(SAVE_FILE) : undefined),
  save: content => Content.save(SAVE_FILE, content),
};
const saves = new SaveRepository(storage);
const audio = new AudioManager();
audio.setVolume(saves.data.volume);

const background = LoveNode("LovePreview/main.lua");
if (background) {
  background.size = Size(DESIGN_WIDTH, DESIGN_HEIGHT);
  background.anchor = Vec2(0.5, 0.5);
  background.addTo(Director.ui, -100);
}

const root = Node();
root.addTo(Director.ui);
root.keyboardEnabled = true;
// The design coordinate system is centered at (0, 0). Keep this transform
// node sizeless: giving it a 720 x 1280 content size with a centered anchor
// would shift every child by (-360, -640) before scale is applied.
root.anchor = Vec2.zero;
const screenLayer = Node();
screenLayer.addTo(root);
const boardLayer = Node();
boardLayer.addTo(root);
const animationLayer = Node();
animationLayer.addTo(root);

const screens = new ScreenStateMachine();
let rulesReturnState: ScreenState = "MAIN_MENU";
let pendingMode: GameMode = "difficulty";
let pendingPreset: DifficultyPreset = DIFFICULTY_PRESETS[1];
let session: GameSession | undefined;
let gameTimer: GameTimer | undefined;
let inputLocked = false;
let swipeStart: ReturnType<typeof Vec2> | undefined;
let gestureSurface: ReturnType<typeof Node> | undefined;
let timerLabel: ReturnType<typeof Label> | undefined;
let recordedOutcome = false;

function rectangle(width: number, height: number, color: ReturnType<typeof Color>, borderColor?: ReturnType<typeof Color>): ReturnType<typeof DrawNode> {
  const draw = DrawNode();
  const hw = width / 2;
  const hh = height / 2;
  draw.drawPolygon([Vec2(-hw, -hh), Vec2(hw, -hh), Vec2(hw, hh), Vec2(-hw, hh)], color, borderColor ? 3 : 0, borderColor ?? color);
  return draw;
}

function makeText(text: string, size: number, color = COLORS.ink, width?: number, alignment: TextAlign = TextAlign.Center): ReturnType<typeof Label> | undefined {
  const label = Label(FONT, size, true);
  if (!label) return undefined;
  label.text = text;
  label.color = color;
  label.alignment = alignment;
  if (width !== undefined) label.textWidth = width;
  label.anchor = alignment === TextAlign.Left ? Vec2(0, 0.5) : Vec2(0.5, 0.5);
  return label;
}

function addText(parent: ReturnType<typeof Node>, text: string, size: number, x: number, y: number, color = COLORS.ink, width?: number, alignment: TextAlign = TextAlign.Center): ReturnType<typeof Label> | undefined {
  const label = makeText(text, size, color, width, alignment);
  if (!label) return undefined;
  label.position = Vec2(x, y);
  label.addTo(parent);
  return label;
}

function addButton(parent: ReturnType<typeof Node>, text: string, x: number, y: number, onTap: () => void, options: { width?: number; height?: number; color?: ReturnType<typeof Color>; fontSize?: number } = {}): ReturnType<typeof Node> {
  const width = options.width ?? 470;
  const height = options.height ?? 86;
  const button = Node();
  button.position = Vec2(x, y);
  button.size = Size(width, height);
  button.anchor = Vec2(0.5, 0.5);
  button.touchEnabled = true;
  button.swallowTouches = true;
  // A sized Dora node uses bottom-left local content coordinates. Its anchor
  // positions that content around button.position, so visible children must be
  // drawn at the content center too. This keeps the painted button and the
  // engine's touch rectangle exactly coincident.
  const contentX = width / 2;
  const contentY = height / 2;
  const face = rectangle(width, height, options.color ?? COLORS.primary);
  face.position = Vec2(contentX, contentY);
  face.addTo(button);
  addText(button, text, options.fontSize ?? 30, contentX, contentY, COLORS.white);
  button.onTapBegan(() => { button.scaleX = 0.97; button.scaleY = 0.97; });
  button.onTapEnded(() => { button.scaleX = 1; button.scaleY = 1; });
  button.onTapped(() => {
    if (inputLocked) return;
    audio.playUi();
    onTap();
  });
  button.addTo(parent);
  return button;
}

function addPanel(parent: ReturnType<typeof Node>, width: number, height: number, x: number, y: number): ReturnType<typeof Node> {
  const panel = Node();
  panel.position = Vec2(x, y);
  rectangle(width, height, COLORS.panel, Color(0xffd9e1ed)).addTo(panel);
  panel.addTo(parent);
  return panel;
}

function clearScreen(): void {
  screenLayer.removeAllChildren();
  boardLayer.removeAllChildren();
  animationLayer.removeAllChildren();
  gestureSurface = undefined;
  timerLabel = undefined;
}

function go(state: ScreenState): void { screens.go(state); renderScreen(); }

function renderHeader(title: string, back?: () => void): void {
  addText(screenLayer, title, 46, 0, 525);
  if (back) addButton(screenLayer, "‹ 返回", -255, 530, back, { width: 150, height: 64, color: COLORS.secondary, fontSize: 24 });
}

function renderMainMenu(): void {
  addText(screenLayer, "反 2048", 72, 0, 330);
  addText(screenLayer, "把数字拆回空白", 28, 0, 252, COLORS.muted);
  addButton(screenLayer, "开始游戏", 0, 65, () => go("MODE_SELECT"));
  addButton(screenLayer, "规则", 0, -55, () => { rulesReturnState = "MAIN_MENU"; go("RULES"); }, { color: COLORS.secondary });
  addButton(screenLayer, "设置 ⚙", 255, 525, () => go("SETTINGS"), { width: 170, height: 64, color: COLORS.secondary, fontSize: 23 });
  addText(screenLayer, "每一步，只生成规则允许的方块", 21, 0, -430, COLORS.muted);
}

function renderModeSelect(): void {
  renderHeader("选择模式", () => go("MAIN_MENU"));
  addButton(screenLayer, "难度模式", 0, 145, () => go("DIFFICULTY_SELECT"));
  addText(screenLayer, "拆完所有 NUMBER 即通关", 22, 0, 82, COLORS.muted);
  addButton(screenLayer, "无尽模式", 0, -85, () => { pendingMode = "endless"; pendingPreset = ENDLESS_PRESET; go("TIMER_SELECT"); }, { color: COLORS.divider });
  addText(screenLayer, "每步补充数字 · 数值随步数提升 · 每 2 步生成 Divider", 20, 0, -148, COLORS.muted, 650);
}

function renderDifficultySelect(): void {
  renderHeader("选择难度", () => go("MODE_SELECT"));
  DIFFICULTY_PRESETS.forEach((preset, index) => {
    const y = 240 - index * 190;
    addButton(screenLayer, preset.name, 0, y, () => { pendingMode = "difficulty"; pendingPreset = preset; go("TIMER_SELECT"); }, { color: index === 0 ? Color(0xff56b99a) : index === 1 ? COLORS.primary : Color(0xffe28a61) });
    const initialTotal = preset.initialValues.reduce((sum, value) => sum + value, 0);
    addText(screenLayer, `初始 ${integerText(preset.initialTileCount)} 块 · 总和 ${integerText(initialTotal)} · 数字 ${integerText(Math.min(...preset.initialValues))}–${integerText(Math.max(...preset.initialValues))}`, 18, 0, y - 62, COLORS.muted, 650);
  });
}

function renderTimerSelect(): void {
  renderHeader("是否计时", () => go(pendingMode === "endless" ? "MODE_SELECT" : "DIFFICULTY_SELECT"));
  addText(screenLayer, `${pendingMode === "endless" ? "无尽模式" : `${pendingPreset.name}难度`} · 棋盘规则不受计时影响`, 23, 0, 350, COLORS.muted);
  addButton(screenLayer, "计时", 0, 100, () => startGame(true));
  addButton(screenLayer, "不计时", 0, -30, () => startGame(false), { color: COLORS.secondary });
  addText(screenLayer, "暂停和规则页面不会累计时间", 21, 0, -165, COLORS.muted);
}

function renderRules(): void {
  renderHeader("规则", () => go(rulesReturnState));
  const viewportHeight = 900;
  const stencil = rectangle(660, viewportHeight, COLORS.white);
  const viewport = ClipNode(stencil);
  viewport.position = Vec2(0, -35);
  const content = Node();
  content.addTo(viewport);
  let y = 405;
  RULE_SECTIONS.forEach(section => {
    addText(content, section.title, 24, -310, y, COLORS.primary, 620, TextAlign.Left);
    const body = addText(content, section.body, 19, -310, y - 30, COLORS.ink, 620, TextAlign.Left);
    if (body) body.anchor = Vec2(0, 1);
    y -= 48 + section.lines * 24;
  });
  const maxScroll = Math.max(0, -410 - y);
  let lastY = 0;
  // ClipNode remains sizeless so its centered stencil/content is not offset by
  // an anchor. A separate, invisible hit node owns the exact viewport rect.
  const dragSurface = Node();
  dragSurface.position = Vec2(0, -35);
  dragSurface.size = Size(660, viewportHeight);
  dragSurface.anchor = Vec2(0.5, 0.5);
  dragSurface.touchEnabled = true;
  dragSurface.swallowTouches = true;
  dragSurface.onTapBegan(touch => { if (touch.first) lastY = touch.location.y; });
  dragSurface.onTapMoved(touch => {
    if (!touch.first || maxScroll <= 0) return;
    const nextY = Math.max(0, Math.min(maxScroll, content.y + touch.location.y - lastY));
    content.y = nextY;
    lastY = touch.location.y;
  });
  viewport.addTo(screenLayer);
  dragSurface.addTo(screenLayer, 1);
  if (maxScroll > 0) addText(screenLayer, "上下拖动查看完整规则", 18, 0, -535, COLORS.muted);
}

function renderSettings(): void {
  renderHeader("设置", () => go("MAIN_MENU"));
  const panel = addPanel(screenLayer, 610, 260, 0, 130);
  addText(panel, "总音量", 28, -235, 75, COLORS.ink, 470, TextAlign.Left);
  const valueText = addText(panel, `${Math.round(saves.data.volume * 100)}%`, 24, 225, 75, COLORS.muted);
  const slider = Node();
  slider.position = Vec2(0, -20);
  slider.size = Size(520, 100);
  slider.anchor = Vec2(0.5, 0.5);
  slider.touchEnabled = true;
  slider.swallowTouches = true;
  const sliderWidth = 520;
  const sliderHeight = 100;
  const trackWidth = 480;
  const trackLeft = (sliderWidth - trackWidth) / 2;
  const trackY = sliderHeight / 2;
  const track = rectangle(trackWidth, 14, Color(0xffc9d5e5));
  track.position = Vec2(sliderWidth / 2, trackY);
  track.addTo(slider);
  const fill = rectangle(480, 14, COLORS.primary);
  fill.position = Vec2(trackLeft, trackY);
  fill.addTo(slider);
  const knob = rectangle(36, 54, COLORS.primary, COLORS.white);
  knob.position = Vec2(trackLeft, trackY);
  knob.addTo(slider);
  const updateSlider = (localX: number, persist: boolean) => {
    const volume = Math.max(0, Math.min(1, (localX - trackLeft) / trackWidth));
    knob.x = trackLeft + volume * trackWidth;
    knob.y = trackY;
    fill.scaleX = volume;
    fill.x = trackLeft + volume * trackWidth / 2;
    fill.y = trackY;
    audio.setVolume(volume);
    if (valueText) valueText.text = `${Math.round(volume * 100)}%`;
    if (persist) saves.setVolume(volume);
  };
  updateSlider(trackLeft + saves.data.volume * trackWidth, false);
  slider.onTapBegan(touch => updateSlider(touch.location.x, false));
  slider.onTapMoved(touch => updateSlider(touch.location.x, false));
  slider.onTapEnded(touch => { updateSlider(touch.location.x, true); audio.playUi(); });
  slider.addTo(panel);
  addText(screenLayer, "设置会保存到本机，下次启动自动恢复。", 21, 0, -90, COLORS.muted);
}

function boardMetrics(size: number): { cellSize: number } { return { cellSize: (BOARD_WIDTH - CELL_GAP * (size + 1)) / size }; }

function positionToPoint(position: Position, size: number): ReturnType<typeof Vec2> {
  const { cellSize } = boardMetrics(size);
  const left = -BOARD_WIDTH / 2 + CELL_GAP + cellSize / 2;
  const top = BOARD_CENTER_Y + BOARD_WIDTH / 2 - CELL_GAP - cellSize / 2;
  return Vec2(left + position.col * (cellSize + CELL_GAP), top - position.row * (cellSize + CELL_GAP));
}

function tileColor(cell: Cell): ReturnType<typeof Color> {
  if (cell.kind === "DIVIDER") return COLORS.divider;
  if (cell.kind === "EMPTY") return COLORS.slot;
  const colors = [0xffe8dff5, 0xffd7ecff, 0xffd8f3e5, 0xffffefc5, 0xffffdccb, 0xffffcfd8, 0xffcde7e8, 0xffd7ddff];
  const level = Math.min(colors.length - 1, Math.floor(Math.log(cell.value) / Math.log(2)));
  return Color(colors[Math.max(0, level)]);
}

function createTile(cell: Cell, position: Position, result?: MoveResult): ReturnType<typeof Node> | undefined {
  if (cell.kind === "EMPTY" || !session) return undefined;
  const { cellSize } = boardMetrics(session.state.size);
  const tile = Node();
  const finalPoint = positionToPoint(position, session.state.size);
  tile.position = finalPoint;
  rectangle(cellSize, cellSize, tileColor(cell), cell.kind === "DIVIDER" ? COLORS.dividerInner : undefined).addTo(tile);
  if (cell.kind === "DIVIDER") rectangle(cellSize - 20, cellSize - 20, COLORS.dividerInner, COLORS.white).addTo(tile);
  addText(tile, cell.kind === "NUMBER" ? integerText(cell.value) : `÷${integerText(cell.divisor)}`, cell.kind === "DIVIDER" ? 38 : 46, 0, 0, cell.kind === "DIVIDER" ? COLORS.white : COLORS.ink);
  if (result) {
    const movement = result.moveEvents.find(event => event.tileId === cell.id);
    const createdBySplit = result.splitEvents.find(event => event.createdTileId === cell.id);
    const sourceSplit = result.splitEvents.find(event => event.sourceTileId === cell.id && event.resultValue > 0);
    const merge = result.mergeEvents.find(event => event.resultTileId === cell.id);
    const dividerMerge = result.dividerMergeEvents.find(event => event.resultTileId === cell.id);
    const spawned = result.spawnEvents.some(event => event.tileId === cell.id);
    const start = movement ? positionToPoint(movement.from, session.state.size) : createdBySplit ? positionToPoint(createdBySplit.source, session.state.size) : finalPoint;
    if (movement || createdBySplit) {
      tile.position = start;
      if (merge || dividerMerge || createdBySplit || sourceSplit) {
        tile.scaleX = 0.72; tile.scaleY = 0.72;
        tile.perform(Spawn(Move(ANIMATION_TIME, start, finalPoint, Ease.OutQuad), Scale(ANIMATION_TIME, 0.72, 1, Ease.OutBack)));
      } else tile.perform(Move(ANIMATION_TIME, start, finalPoint, Ease.OutQuad));
    } else if (merge || dividerMerge || spawned) {
      tile.scaleX = 0.55; tile.scaleY = 0.55; tile.opacity = spawned ? 0 : 1;
      tile.perform(Spawn(Scale(ANIMATION_TIME, 0.55, 1, Ease.OutBack), Opacity(ANIMATION_TIME, tile.opacity, 1)));
    }
  }
  return tile;
}

function addSplitOneGhosts(result: MoveResult): void {
  if (!session) return;
  const { cellSize } = boardMetrics(session.state.size);
  result.splitEvents.filter(event => event.originalValue === 1).forEach(event => {
    const ghost = Node();
    ghost.position = positionToPoint(event.source, session!.state.size);
    const one: NumberTile = { kind: "NUMBER", id: -1, value: 1, createdBySplitThisMove: false };
    rectangle(cellSize, cellSize, tileColor(one)).addTo(ghost);
    addText(ghost, "1", 46, 0, 0);
    ghost.perform(Spawn(Scale(ANIMATION_TIME, 1, 0.25, Ease.OutQuad), Opacity(ANIMATION_TIME, 1, 0)));
    ghost.addTo(animationLayer);
  });
}

function addMergeGhosts(result: MoveResult): void {
  if (!session) return;
  const { cellSize } = boardMetrics(session.state.size);
  result.mergeEvents.forEach(event => {
    const finalMove = result.moveEvents.find(move => move.tileId === event.resultTileId);
    const destination = positionToPoint(finalMove?.to ?? event.destination, session!.state.size);
    event.sources.forEach(source => {
      const ghost = Node();
      const start = positionToPoint(source, session!.state.size);
      ghost.position = start;
      const value = event.resultValue / 2;
      const number: NumberTile = { kind: "NUMBER", id: -1, value, createdBySplitThisMove: false };
      rectangle(cellSize, cellSize, tileColor(number)).addTo(ghost);
      addText(ghost, integerText(value), 46, 0, 0);
      ghost.perform(Spawn(Move(ANIMATION_TIME, start, destination, Ease.OutQuad), Opacity(ANIMATION_TIME, 0.9, 0)));
      ghost.addTo(animationLayer);
    });
  });
}

function addDividerGhosts(result: MoveResult): void {
  if (!session) return;
  const { cellSize } = boardMetrics(session.state.size);
  result.dividerEvents.forEach(event => {
    const ghost = Node();
    ghost.position = positionToPoint(event.position, session!.state.size);
    rectangle(cellSize, cellSize, COLORS.divider, COLORS.dividerInner).addTo(ghost);
    rectangle(cellSize - 20, cellSize - 20, COLORS.dividerInner, COLORS.white).addTo(ghost);
    addText(ghost, `÷${integerText(event.divisor)}`, 38, 0, 0, COLORS.white);
    addText(ghost, `${integerText(event.originalValue)}→${integerText(event.resultValue)}`, 18, 0, -cellSize * 0.3, COLORS.white);
    ghost.perform(Spawn(
      Scale(ANIMATION_TIME, 1, 0.3, Ease.OutQuad),
      Opacity(ANIMATION_TIME, 1, 0),
    ));
    ghost.addTo(animationLayer);
  });
}

function addDividerMergeGhosts(result: MoveResult): void {
  if (!session) return;
  const { cellSize } = boardMetrics(session.state.size);
  result.dividerMergeEvents.forEach(event => {
    const finalMove = result.moveEvents.find(move => move.tileId === event.resultTileId);
    const destination = positionToPoint(finalMove?.to ?? event.destination, session!.state.size);
    event.sources.forEach(source => {
      const ghost = Node();
      const start = positionToPoint(source, session!.state.size);
      ghost.position = start;
      rectangle(cellSize, cellSize, COLORS.divider, COLORS.dividerInner).addTo(ghost);
      rectangle(cellSize - 20, cellSize - 20, COLORS.dividerInner, COLORS.white).addTo(ghost);
      addText(ghost, `÷${integerText(event.resultDivisor / 2)}`, 38, 0, 0, COLORS.white);
      ghost.perform(Spawn(Move(ANIMATION_TIME, start, destination, Ease.OutQuad), Opacity(ANIMATION_TIME, 0.9, 0)));
      ghost.addTo(animationLayer);
    });
  });
}

function renderBoard(result?: MoveResult): void {
  if (!session) return;
  boardLayer.removeAllChildren();
  animationLayer.removeAllChildren();
  const boardBack = rectangle(BOARD_WIDTH, BOARD_WIDTH, COLORS.board);
  boardBack.position = Vec2(0, BOARD_CENTER_Y);
  boardBack.addTo(boardLayer);
  const { cellSize } = boardMetrics(session.state.size);
  for (let row = 0; row < session.state.size; row += 1) {
    for (let col = 0; col < session.state.size; col += 1) {
      const position = { row, col };
      const slot = rectangle(cellSize, cellSize, COLORS.slot);
      slot.position = positionToPoint(position, session.state.size);
      slot.addTo(boardLayer);
      const tile = createTile(session.state.cells[row * session.state.size + col], position, result);
      if (tile) tile.addTo(boardLayer);
    }
  }
  if (result) {
    addSplitOneGhosts(result);
    addDividerGhosts(result);
    addMergeGhosts(result);
    addDividerMergeGhosts(result);
  }
  const surface = Node();
  surface.position = Vec2(0, BOARD_CENTER_Y);
  surface.size = Size(BOARD_WIDTH, BOARD_WIDTH);
  surface.anchor = Vec2(0.5, 0.5);
  surface.touchEnabled = !inputLocked;
  surface.swallowTouches = true;
  surface.onTapFilter(touch => { if (!touch.first || inputLocked) touch.enabled = false; });
  surface.onTapBegan(touch => { swipeStart = touch.location; });
  surface.onTapEnded(touch => {
    if (!swipeStart || inputLocked || screens.current !== "PLAYING") return;
    const dx = touch.location.x - swipeStart.x;
    const dy = touch.location.y - swipeStart.y;
    swipeStart = undefined;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) attemptMove(dx > 0 ? "right" : "left");
    else attemptMove(dy > 0 ? "up" : "down");
  });
  surface.addTo(boardLayer, 100);
  gestureSurface = surface;
}

function renderPlaying(result?: MoveResult): void {
  if (!session) return;
  const modeName = session.mode === "endless" ? "无尽模式" : `${session.preset.name}难度`;
  addText(screenLayer, modeName, 25, -320, 540, COLORS.ink, 270, TextAlign.Left);
  addButton(screenLayer, "撤销", 150, 540, undoMove, { width: 130, height: 60, color: COLORS.secondary, fontSize: 22 });
  addButton(screenLayer, "暂停", 285, 540, pauseGame, { width: 120, height: 60, color: COLORS.secondary, fontSize: 22 });
  addText(screenLayer, `分数 ${integerText(session.score)}`, 24, -320, 475, COLORS.primary, 250, TextAlign.Left);
  addText(screenLayer, `移动 ${integerText(session.moveCount)}`, 24, -35, 475, COLORS.ink, 200, TextAlign.Left);
  if (session.timed && gameTimer) timerLabel = addText(screenLayer, `本局用时 ${formatTime(gameTimer.milliseconds)}`, 20, -320, 425, COLORS.muted, 640, TextAlign.Left);
  renderBoard(result);
  addText(screenLayer, "在棋盘上滑动 · 键盘方向键 / WASD", 20, 0, -455, COLORS.muted);
}

function renderPause(): void {
  if (!session) return;
  addText(screenLayer, "已暂停", 52, 0, 350);
  addText(screenLayer, `${session.mode === "endless" ? "无尽模式" : session.preset.name} · 分数 ${integerText(session.score)}`, 24, 0, 285, COLORS.muted);
  addButton(screenLayer, "继续", 0, 100, resumeGame);
  addButton(screenLayer, "规则", 0, -20, () => { rulesReturnState = "PAUSED"; go("RULES"); }, { color: COLORS.secondary });
  addButton(screenLayer, "返回主菜单", 0, -140, () => go("MAIN_MENU"), { color: COLORS.danger });
}

function highestNumber(): number {
  if (!session) return 0;
  return session.state.cells.reduce((highest, cell) => cell.kind === "NUMBER" ? Math.max(highest, cell.value) : highest, 0);
}

function recordOutcome(): void {
  if (!session || recordedOutcome) return;
  recordedOutcome = true;
  const time = session.timed && gameTimer ? gameTimer.milliseconds : undefined;
  if (session.mode === "endless") saves.recordEndless(session.score, highestNumber());
  else if (session.runStatus === "victory") saves.recordDifficulty(session.preset, session.score, time);
}

function renderOutcome(victory: boolean): void {
  if (!session) return;
  recordOutcome();
  addText(screenLayer, victory ? "通关！" : session.mode === "endless" ? "无尽结束" : "无法继续", 58, 0, 390, victory ? Color(0xff43a985) : COLORS.danger);
  const panel = addPanel(screenLayer, 560, 320, 0, 125);
  addText(panel, `最终分数  ${integerText(session.score)}`, 30, 0, 95, COLORS.primary);
  addText(panel, `移动次数  ${integerText(session.moveCount)}`, 25, 0, 35);
  if (session.mode === "endless") addText(panel, `最高数字  ${integerText(highestNumber())}`, 25, 0, -25);
  addText(panel, session.timed && gameTimer ? `完成时间  ${formatTime(gameTimer.milliseconds)}` : "本局未计时", 23, 0, -85, COLORS.muted);
  addButton(screenLayer, "再来一局", 0, -160, () => startGame(session!.timed));
  addButton(screenLayer, "返回主菜单", 0, -270, () => go("MAIN_MENU"), { color: COLORS.secondary });
}

function renderScreen(result?: MoveResult): void {
  clearScreen();
  if (screens.current === "MAIN_MENU") renderMainMenu();
  else if (screens.current === "MODE_SELECT") renderModeSelect();
  else if (screens.current === "DIFFICULTY_SELECT") renderDifficultySelect();
  else if (screens.current === "TIMER_SELECT") renderTimerSelect();
  else if (screens.current === "RULES") renderRules();
  else if (screens.current === "SETTINGS") renderSettings();
  else if (screens.current === "PLAYING") renderPlaying(result);
  else if (screens.current === "PAUSED") renderPause();
  else if (screens.current === "VICTORY") renderOutcome(true);
  else if (screens.current === "GAME_OVER") renderOutcome(false);
}

function startGame(timed: boolean): void {
  session = new GameSession(pendingPreset, doraRandom, undefined, undefined, { mode: pendingMode, timed });
  gameTimer = new GameTimer(timed);
  gameTimer.start();
  recordedOutcome = false;
  inputLocked = false;
  screens.go("PLAYING");
  renderScreen();
}

function pauseGame(): void { if (session && !inputLocked) { session.pause(); gameTimer?.pause(); go("PAUSED"); } }
function resumeGame(): void { if (session) { session.resume(); gameTimer?.resume(); go("PLAYING"); } }
function undoMove(): void { if (session && !inputLocked && screens.current === "PLAYING" && session.undo()) renderScreen(); }

function finishMove(): void {
  if (!session) return;
  inputLocked = false;
  root.keyboardEnabled = true;
  if (session.runStatus === "victory") { gameTimer?.stop(); audio.playVictory(); go("VICTORY"); }
  else if (session.runStatus === "defeat") { gameTimer?.stop(); audio.playGameOver(); go("GAME_OVER"); }
  else renderScreen();
}

function attemptMove(direction: Direction): void {
  if (!session || inputLocked || screens.current !== "PLAYING" || session.runStatus !== "playing") return;
  const result = session.move(direction);
  if (!result.changed) return;
  inputLocked = true;
  if (gestureSurface) gestureSurface.touchEnabled = false;
  root.keyboardEnabled = false;
  audio.playMove(result);
  renderScreen(result);
  root.once(() => {
    sleep(ANIMATION_TIME + 0.04);
    if (session?.runStatus === "playing" && result.spawnEvents.length > 0) audio.playSpawn();
    finishMove();
  });
}

root.onKeyDown(key => {
  if (key === KeyName.Left || key === KeyName.A) attemptMove("left");
  else if (key === KeyName.Right || key === KeyName.D) attemptMove("right");
  else if (key === KeyName.Up || key === KeyName.W) attemptMove("up");
  else if (key === KeyName.Down || key === KeyName.S) attemptMove("down");
});
root.onUpdate(() => {
  if (screens.current === "PLAYING" && gameTimer) {
    gameTimer.update(App.deltaTime);
    if (timerLabel) timerLabel.text = `本局用时 ${formatTime(gameTimer.milliseconds)}`;
  }
  return false;
});

function updateLayout(): void {
  const safe = App.safeArea;
  const visual = App.visualSize;
  const fit = fitPortraitCanvas({
    viewWidth: View.size.width,
    viewHeight: View.size.height,
    visualWidth: visual.width,
    visualHeight: visual.height,
    safeX: safe.x,
    safeY: safe.y,
    safeWidth: safe.width,
    safeHeight: safe.height,
  });
  root.scaleX = fit.scale;
  root.scaleY = fit.scale;
  root.position = Vec2(fit.rootX, fit.rootY);
  if (background) {
    background.position = Vec2.zero;
    background.scaleX = fit.backgroundScale * fit.scale;
    background.scaleY = fit.backgroundScale * fit.scale;
  }
}
Director.ui.onAppChange(settingName => { if (settingName === "Size") updateLayout(); });
updateLayout();
renderScreen();
