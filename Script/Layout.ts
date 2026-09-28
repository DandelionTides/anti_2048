/** Fixed portrait canvas used by every screen and hit target. */
export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

export interface SafeViewport {
  viewWidth: number;
  viewHeight: number;
  visualWidth: number;
  visualHeight: number;
  safeX: number;
  safeY: number;
  safeWidth: number;
  safeHeight: number;
}

export interface FittedLayout {
  scale: number;
  /** Root-node offset in Director.ui view coordinates. */
  rootX: number;
  /** Root-node offset in Director.ui view coordinates. */
  rootY: number;
  /** Extra scale, relative to the fitted canvas, needed to cover the view. */
  backgroundScale: number;
  safeViewWidth: number;
  safeViewHeight: number;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

function positive(value: number, fallback: number): number {
  return value > 0 ? value : fallback;
}

/**
 * Maps Dora's logical safe area to Director.ui view coordinates, then fits one
 * fixed 720 x 1280 coordinate system inside it. No game-camera transform is
 * involved: drawing and touch nodes share the same UI-node transform.
 */
export function fitPortraitCanvas(viewport: SafeViewport): FittedLayout {
  const viewWidth = positive(viewport.viewWidth, DESIGN_WIDTH);
  const viewHeight = positive(viewport.viewHeight, DESIGN_HEIGHT);
  const visualWidth = positive(viewport.visualWidth, viewWidth);
  const visualHeight = positive(viewport.visualHeight, viewHeight);
  const pixelX = viewWidth / visualWidth;
  const pixelY = viewHeight / visualHeight;

  const safeWidth = viewport.safeWidth > 0 && viewport.safeWidth <= visualWidth
    ? viewport.safeWidth : visualWidth;
  const safeHeight = viewport.safeHeight > 0 && viewport.safeHeight <= visualHeight
    ? viewport.safeHeight : visualHeight;
  const safeX = viewport.safeWidth > 0 ? viewport.safeX : 0;
  const safeY = viewport.safeHeight > 0 ? viewport.safeY : 0;
  const safeViewWidth = safeWidth * pixelX;
  const safeViewHeight = safeHeight * pixelY;
  const scale = Math.min(safeViewWidth / DESIGN_WIDTH, safeViewHeight / DESIGN_HEIGHT);

  const centerOffsetX = (safeX + safeWidth / 2 - visualWidth / 2) * pixelX;
  const centerOffsetY = (safeY + safeHeight / 2 - visualHeight / 2) * pixelY;
  const backgroundScale = Math.max(
    viewWidth / (DESIGN_WIDTH * scale),
    viewHeight / (DESIGN_HEIGHT * scale),
  );

  return {
    scale,
    rootX: centerOffsetX,
    rootY: centerOffsetY,
    backgroundScale,
    safeViewWidth,
    safeViewHeight,
  };
}

/** Converts a fixed-canvas coordinate to the centered Director.ui view space. */
export function designToView(point: LayoutPoint, layout: FittedLayout): LayoutPoint {
  return {
    x: layout.rootX + point.x * layout.scale,
    y: layout.rootY + point.y * layout.scale,
  };
}

/** Converts a Director.ui view coordinate back to the fixed portrait canvas. */
export function viewToDesign(point: LayoutPoint, layout: FittedLayout): LayoutPoint {
  return {
    x: (point.x - layout.rootX) / layout.scale,
    y: (point.y - layout.rootY) / layout.scale,
  };
}
