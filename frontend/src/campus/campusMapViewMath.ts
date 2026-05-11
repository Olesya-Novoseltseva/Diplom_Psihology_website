/** Логика масштабирования плана кампуса колёсиком (без DOM). */

export const MAP_VIEW_LIMITS = {
  minScale: 0.35,
  maxScale: 4,
  wheelFactor: 0.00145,
  inset: 40,
} as const;

export type MapViewTransform = { scale: number; tx: number; ty: number };

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function clampScale(s: number): number {
  return Math.min(MAP_VIEW_LIMITS.maxScale, Math.max(MAP_VIEW_LIMITS.minScale, s));
}

function clampPan(t: MapViewTransform, vw: number, vh: number, layerW: number, layerH: number): MapViewTransform {
  const scale = clampScale(t.scale);
  const cw = layerW * scale;
  const ch = layerH * scale;
  const m = MAP_VIEW_LIMITS.inset;

  let tx = t.tx;
  let ty = t.ty;

  if (cw <= vw + m) tx = (vw - cw) / 2;
  else tx = Math.min(m, Math.max(tx, vw - cw - m));

  if (ch <= vh + m) ty = (vh - ch) / 2;
  else ty = Math.min(m, Math.max(ty, vh - ch - m));

  return { scale, tx, ty };
}

/** После загрузки схемы: весь слой вписан в окно превью. */
export function fitLayerInViewport(vpW: number, vpH: number, layerW: number, layerH: number): MapViewTransform {
  if (layerW < 1 || layerH < 1 || vpW < 1 || vpH < 1) return { scale: 1, tx: 0, ty: 0 };

  let s = Math.min(vpW / layerW, vpH / layerH);
  s = clampScale(s);
  return clampPan({ scale: s, tx: (vpW - layerW * s) / 2, ty: (vpH - layerH * s) / 2 }, vpW, vpH, layerW, layerH);
}

/** Колёсико (deltaY>0 → отдаление). Зум относительно точки под курсором в координатах окна превью. */
export function wheelZoomTowardPoint(
  prev: MapViewTransform,
  vw: number,
  vh: number,
  layerW: number,
  layerH: number,
  vx: number,
  vy: number,
  deltaY: number,
): MapViewTransform {
  const factor = Math.exp(-deltaY * MAP_VIEW_LIMITS.wheelFactor);
  const newScale = clampScale(prev.scale * factor);
  if (Math.abs(newScale - prev.scale) < 1e-10) return clampPan(prev, vw, vh, layerW, layerH);

  const wx = (vx - prev.tx) / prev.scale;
  const wy = (vy - prev.ty) / prev.scale;

  const tx = vx - wx * newScale;
  const ty = vy - wy * newScale;

  return clampPan({ scale: newScale, tx, ty }, vw, vh, layerW, layerH);
}

/** Курсор браузера → процент по слою (как хранится в БД), layerW/H — размер слоя без scale. */
export function clientToLayerPercent(
  viewportRect: DOMRectReadOnly | DOMRect,
  layerW: number,
  layerH: number,
  clientX: number,
  clientY: number,
  t: MapViewTransform,
): { x: number; y: number } {
  const vx = clientX - viewportRect.left;
  const vy = clientY - viewportRect.top;
  const lx = (vx - t.tx) / t.scale;
  const ly = (vy - t.ty) / t.scale;
  return { x: clampPct((lx / layerW) * 100), y: clampPct((ly / layerH) * 100) };
}
