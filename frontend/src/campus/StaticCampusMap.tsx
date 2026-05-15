import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MarkerDto } from "../api/CampusApiService.js";
import type { MapViewTransform } from "./campusMapViewMath.js";
import {
  applyPanDelta,
  clientToLayerPercent,
  fitLayerInViewport,
  viewportAllowsPan,
  wheelZoomTowardPoint,
} from "./campusMapViewMath.js";

const categoryRu: Record<string, string> = {
  QUIET: "Тихое место",
  FOOD: "Еда",
  STUDY: "Учёба",
  RELAX: "Отдых",
  SERVICE: "Сервис",
  OTHER: "Другое",
};

function color(category: string): string {
  switch (category) {
    case "FOOD":
      return "#ea580c";
    case "QUIET":
      return "#0d9488";
    case "STUDY":
      return "#2563eb";
    case "RELAX":
      return "#7c3aed";
    case "SERVICE":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

const DRAG_START_PX = 6;
/** Сдвиг схемы ЛКМ: до порога — ещё «клик», после — панорамирование. */
const MAP_PAN_THRESHOLD_PX = 6;

const IDENTITY_TRANSFORM: MapViewTransform = { scale: 1, tx: 0, ty: 0 };

/** Карточка метки (px от левого-верха viewport): под меткой или выше + сдвиг пользователя и clamp */
function clampPopupToViewport(
  vr: DOMRectReadOnly,
  pin: DOMRectReadOnly,
  popupW: number,
  popupH: number,
  drag: { x: number; y: number },
): { left: number; top: number } {
  const m = 10;
  const gap = 12;
  const cx = pin.left + pin.width / 2 - vr.left;
  const cy = pin.top + pin.height / 2 - vr.top;

  let left = cx - popupW / 2;
  let top = cy + gap;

  const roomBelow = vr.height - m - (top + popupH);
  if (roomBelow < 0) {
    const aboveTop = cy - gap - popupH;
    if (aboveTop >= m) top = aboveTop;
  }

  left += drag.x;
  top += drag.y;

  const maxTop = vr.height - m - popupH;
  left = Math.max(m, Math.min(left, vr.width - m - popupW));
  top = Math.max(m, Math.min(top, maxTop));

  return { left, top };
}

type Props = {
  markers: MarkerDto[];
  planImageUrl?: string;
  editMode?: boolean;
  /** Режим админа: содержимое карточки при клике по точке (без перетаскивания). */
  adminPinPanel?: (marker: MarkerDto, close: () => void) => ReactNode;
  onMarkerDragEnd?: (id: string, x: number, y: number) => void | Promise<void>;
  onMapClickPct?: (x: number, y: number) => void;
};

export function StaticCampusMap({
  markers,
  planImageUrl = "/campus-plan-placeholder.svg",
  editMode = false,
  adminPinPanel,
  onMarkerDragEnd,
  onMapClickPct,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<MapViewTransform>(IDENTITY_TRANSFORM);

  const [view, setView] = useState<MapViewTransform>(IDENTITY_TRANSFORM);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, { x: number; y: number }>>({});
  const [dragBusy, setDragBusy] = useState(false);

  const [interactionKind, setInteractionKind] = useState<"idle" | "dragging">("idle");

  transformRef.current = view;

  type MapPanSession = {
    pointerId: number;
    lastX: number;
    lastY: number;
    startX: number;
    startY: number;
    hasPanned: boolean;
  };
  const mapPanRef = useRef<MapPanSession | null>(null);
  const [viewportPanDragging, setViewportPanDragging] = useState(false);
  const [panHint, setPanHint] = useState(false);

  const activePinRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupFloatPos, setPopupFloatPos] = useState<{ left: number; top: number } | null>(null);
  const [popupDragPx, setPopupDragPx] = useState({ x: 0, y: 0 });
  const [popupSizeTick, setPopupSizeTick] = useState(0);
  const popupDragSessionRef = useRef<{ pointerId: number; startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [popupChromeDragging, setPopupChromeDragging] = useState(false);

  const hasAdminPinPanel = adminPinPanel != null;

  const flushPreview = useCallback(() => setPreview({}), []);

  const applyFit = useCallback(() => {
    const vpEl = viewportRef.current;
    const lyr = layerRef.current;
    if (!vpEl || !lyr || lyr.offsetWidth < 1 || lyr.offsetHeight < 1) return;

    const t = fitLayerInViewport(vpEl.clientWidth, vpEl.clientHeight, lyr.offsetWidth, lyr.offsetHeight);
    transformRef.current = t;
    setView(t);
  }, []);

  useEffect(() => {
    transformRef.current = IDENTITY_TRANSFORM;
    setView(IDENTITY_TRANSFORM);
  }, [planImageUrl]);

  useEffect(() => {
    setActiveId((id) => {
      if (id == null) return id;
      return markers.some((m) => m.id === id) ? id : null;
    });
    setPreview((prev) => {
      const ids = new Set(markers.map((m) => m.id));
      const filtered = Object.fromEntries(Object.entries(prev).filter(([k]) => ids.has(k)));
      return Object.keys(filtered).length === Object.keys(prev).length ? prev : filtered;
    });
  }, [markers]);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const lyr = layerRef.current;
    if (!vp || !lyr || lyr.offsetWidth < 1 || lyr.offsetHeight < 1) {
      setPanHint(view.scale > 1.02);
      return;
    }
    setPanHint(viewportAllowsPan(vp.clientWidth, vp.clientHeight, lyr.offsetWidth, lyr.offsetHeight, view));
  }, [markers, planImageUrl, view]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;

      const lyr = layerRef.current;
      if (!lyr || lyr.offsetWidth < 1 || lyr.offsetHeight < 1) return;

      e.preventDefault();
      const vw = vp.clientWidth;
      const vh = vp.clientHeight;
      const r = vp.getBoundingClientRect();
      const vx = e.clientX - r.left;
      const vy = e.clientY - r.top;

      const next = wheelZoomTowardPoint(transformRef.current, vw, vh, lyr.offsetWidth, lyr.offsetHeight, vx, vy, e.deltaY);
      transformRef.current = next;
      setView(next);
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  const pctFromClient = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const vp = viewportRef.current;
    const lyr = layerRef.current;
    if (!vp || !lyr || lyr.offsetWidth < 1 || lyr.offsetHeight < 1) return null;

    return clientToLayerPercent(vp.getBoundingClientRect(), lyr.offsetWidth, lyr.offsetHeight, clientX, clientY, transformRef.current);
  }, []);

  const startPinInteraction = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, m: MarkerDto) => {
      if (!editMode) {
        setActiveId(m.id);
        return;
      }

      const vpOk = viewportRef.current;
      const lyrOk = layerRef.current;
      if (!vpOk || !lyrOk) return;

      e.preventDefault();
      e.stopPropagation();

      let movedPx = false;
      setPreview({});

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - e.clientX;
        const dy = ev.clientY - e.clientY;
        if (Math.hypot(dx, dy) >= DRAG_START_PX) {
          movedPx = true;
          setInteractionKind("dragging");
        }
        if (!movedPx) return;

        const p = pctFromClient(ev.clientX, ev.clientY);
        if (p) setPreview((prev) => ({ ...prev, [m.id]: { x: p.x, y: p.y } }));
      }

      async function onUp(ev: PointerEvent) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        try {
          if (movedPx && onMarkerDragEnd) {
            const p = pctFromClient(ev.clientX, ev.clientY);
            if (p) {
              setDragBusy(true);
              await Promise.resolve(onMarkerDragEnd(m.id, p.x, p.y));
            }
          } else {
            setActiveId(m.id);
          }
        } finally {
          flushPreview();
          setDragBusy(false);
          setInteractionKind("idle");
        }
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [editMode, onMarkerDragEnd, flushPreview, pctFromClient],
  );

  function stopMapPan(vpEl: HTMLElement, pointerId: number): void {
    mapPanRef.current = null;
    setViewportPanDragging(false);
    try {
      if (vpEl.hasPointerCapture(pointerId)) vpEl.releasePointerCapture(pointerId);
    } catch {
      //
    }
  }

  function handleViewportPointerDown(pe: ReactPointerEvent<HTMLDivElement>) {
    if (pe.button !== 0) return;

    const el = pe.target as HTMLElement;
    if (el.closest(".static-campus-map__pin") || el.closest(".static-campus-map__popup")) return;

    const vp = viewportRef.current;
    const lyr = layerRef.current;
    if (!vp || !lyr || lyr.offsetWidth < 1 || lyr.offsetHeight < 1) return;

    const canPan = viewportAllowsPan(vp.clientWidth, vp.clientHeight, lyr.offsetWidth, lyr.offsetHeight, transformRef.current);

    if (canPan) {
      pe.preventDefault();
      mapPanRef.current = {
        pointerId: pe.pointerId,
        lastX: pe.clientX,
        lastY: pe.clientY,
        startX: pe.clientX,
        startY: pe.clientY,
        hasPanned: false,
      };
      setViewportPanDragging(false);
      pe.currentTarget.setPointerCapture(pe.pointerId);
      return;
    }

    if (!editMode || !onMapClickPct) return;

    const p = pctFromClient(pe.clientX, pe.clientY);
    if (p) onMapClickPct(p.x, p.y);
  }

  function handleViewportPointerMove(pe: ReactPointerEvent<HTMLDivElement>) {
    const drag = mapPanRef.current;
    if (!drag || pe.pointerId !== drag.pointerId) return;

    if (!drag.hasPanned) {
      const sx = pe.clientX - drag.startX;
      const sy = pe.clientY - drag.startY;
      if (Math.hypot(sx, sy) < MAP_PAN_THRESHOLD_PX) return;
      drag.hasPanned = true;
      setViewportPanDragging(true);
    }

    const vp = viewportRef.current;
    const lyr = layerRef.current;
    if (!vp || !lyr || lyr.offsetWidth < 1 || lyr.offsetHeight < 1) return;

    const dtx = pe.clientX - drag.lastX;
    const dty = pe.clientY - drag.lastY;
    drag.lastX = pe.clientX;
    drag.lastY = pe.clientY;

    const next = applyPanDelta(transformRef.current, vp.clientWidth, vp.clientHeight, lyr.offsetWidth, lyr.offsetHeight, dtx, dty);
    transformRef.current = next;
    setView(next);
  }

  function handleViewportPointerUpOrCancel(pe: ReactPointerEvent<HTMLDivElement>) {
    const drag = mapPanRef.current;
    if (!drag || pe.pointerId !== drag.pointerId) return;

    if (!drag.hasPanned && editMode && onMapClickPct) {
      const p = pctFromClient(pe.clientX, pe.clientY);
      if (p) onMapClickPct(p.x, p.y);
    }

    stopMapPan(pe.currentTarget, pe.pointerId);
  }

  const activeMarker = activeId ? markers.find((mk) => mk.id === activeId) : null;

  let activeDisplay: (MarkerDto & { x: number; y: number }) | null = null;
  if (activeMarker) {
    const pv = preview[activeMarker.id];
    activeDisplay = pv ? { ...activeMarker, ...pv } : activeMarker;
  }

  const previewPinOffset = activeMarker ? preview[activeMarker.id] : undefined;

  useEffect(() => {
    setPopupDragPx({ x: 0, y: 0 });
  }, [activeId, view.tx, view.ty, view.scale]);

  useEffect(() => {
    if (!activeId) return;
    let ro: ResizeObserver | undefined;
    const id = requestAnimationFrame(() => {
      const el = popupRef.current;
      if (!el) return;
      ro = new ResizeObserver(() => setPopupSizeTick((n) => n + 1));
      ro.observe(el);
    });
    return () => {
      cancelAnimationFrame(id);
      ro?.disconnect();
    };
  }, [activeId]);

  useLayoutEffect(() => {
    if (!activeDisplay || interactionKind === "dragging") {
      setPopupFloatPos(null);
      return;
    }
    let rafId = 0;
    rafId = requestAnimationFrame(() => {
      const pin = activePinRef.current;
      const vp = viewportRef.current;
      const pop = popupRef.current;
      if (!pin || !vp) {
        setPopupFloatPos(null);
        return;
      }
      const vr = vp.getBoundingClientRect();
      const pr = pin.getBoundingClientRect();
      const estW = editMode && hasAdminPinPanel ? 400 : 392;
      const estH = editMode && hasAdminPinPanel ? 280 : 200;
      const pw = pop && pop.offsetWidth > 24 ? pop.offsetWidth : estW;
      const ph = pop && pop.offsetHeight > 24 ? pop.offsetHeight : estH;
      setPopupFloatPos(clampPopupToViewport(vr, pr, pw, ph, popupDragPx));
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    activeDisplay?.id,
    activeDisplay?.title,
    previewPinOffset?.x,
    previewPinOffset?.y,
    interactionKind,
    view.tx,
    view.ty,
    view.scale,
    popupDragPx.x,
    popupDragPx.y,
    popupSizeTick,
    markers.length,
    editMode,
    hasAdminPinPanel,
  ]);

  function handlePopupChromePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPopupChromeDragging(true);
    popupDragSessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ox: popupDragPx.x,
      oy: popupDragPx.y,
    };
  }

  function handlePopupChromePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = popupDragSessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    e.stopPropagation();
    setPopupDragPx({
      x: s.ox + e.clientX - s.startX,
      y: s.oy + e.clientY - s.startY,
    });
  }

  function handlePopupChromePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const s = popupDragSessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    popupDragSessionRef.current = null;
    setPopupChromeDragging(false);
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      //
    }
  }

  return (
    <div
      className={`static-campus-map${editMode ? " static-campus-map--edit" : ""}${dragBusy ? " static-campus-map--dragging" : ""}`}
      aria-label={
        editMode
          ? "Карта: карточку метки можно перетащить за верхнюю полоску и прокрутить содержимое. Левой кнопкой сдвиг схемы, Ctrl и колёсико — масштаб."
          : panHint
            ? "Карта: карточку можно сдвинуть за полоску сверху и прокрутить текст. Масштаб — Ctrl и колёсико, сдвиг схемы — левая кнопка."
            : "Карта: карточку метки можно перетащить за полоску и прокрутить. Масштаб — Ctrl и колёсико мыши."
      }
    >
      {editMode ? (
        <p className="static-campus-map__edit-hint">
          Клик по точке — редактирование. Перетаскивание маркера левой кнопкой — положение на схеме. Лёгкий клик по плану —
          координаты для новой точки ниже. <strong>Ctrl + колёсико</strong> — масштаб. Когда карта увеличена: зажмите левую
          кнопку на плане и потяните, чтобы сдвинуть схему. Карточка точки: верхняя полоска — перенос, внутри — прокрутка.
        </p>
      ) : null}
      <div
        ref={viewportRef}
        className={`static-campus-map__viewport${viewportPanDragging ? " static-campus-map__viewport--drag-pan" : ""}`}
        style={{
          cursor: viewportPanDragging ? "grabbing" : panHint ? "grab" : editMode ? "crosshair" : "default",
        }}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUpOrCancel}
        onPointerCancel={handleViewportPointerUpOrCancel}
      >
        <div className="static-campus-map__content" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}>
          <div ref={layerRef} className="static-campus-map__layer">
            <img
              className="static-campus-map__image"
              src={planImageUrl}
              alt="План кампуса"
              draggable={false}
              onLoad={() => requestAnimationFrame(applyFit)}
            />
            {markers.map((m) => {
              const pos = preview[m.id] ?? { x: m.x, y: m.y };
              return (
                <button
                  type="button"
                  key={m.id}
                  ref={m.id === activeId ? activePinRef : undefined}
                  className="static-campus-map__pin"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, backgroundColor: color(m.category), touchAction: "none" }}
                  title={m.title}
                  onPointerDown={(e) => startPinInteraction(e, m)}
                />
              );
            })}
          </div>
        </div>
        {activeDisplay && interactionKind !== "dragging" ? (
          <div
            ref={popupRef}
            className={`static-campus-map__popup static-campus-map__popup--floating${editMode && adminPinPanel ? " static-campus-map__popup--admin" : ""}`}
            style={{
              left: popupFloatPos?.left ?? 0,
              top: popupFloatPos?.top ?? 0,
              visibility: popupFloatPos ? "visible" : "hidden",
            }}
            onPointerDown={(pointerEv) => pointerEv.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={editMode && adminPinPanel ? "campus-admin-pin-title" : "campus-pin-title"}
          >
            <div className="static-campus-map__popup-chrome">
              <div
                className={`static-campus-map__popup-dragzone${popupChromeDragging ? " static-campus-map__popup-dragzone--dragging" : ""}`}
                onPointerDown={handlePopupChromePointerDown}
                onPointerMove={handlePopupChromePointerMove}
                onPointerUp={handlePopupChromePointerUp}
                onPointerCancel={handlePopupChromePointerUp}
              >
                <span className="static-campus-map__popup-grip" aria-hidden />
                <span className="static-campus-map__popup-drag-hint">{editMode ? "Перетащите окно" : "Потащите за полоску"}</span>
              </div>
              <button
                type="button"
                className="static-campus-map__close"
                aria-label="Закрыть"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setActiveId(null)}
              >
                ×
              </button>
            </div>
            <div className="static-campus-map__popup-scroll">
              {editMode && adminPinPanel ? (
                adminPinPanel(activeDisplay, () => setActiveId(null))
              ) : (
                <>
                  {activeDisplay.imageUrl ? <img src={activeDisplay.imageUrl} alt="" className="static-campus-map__photo" /> : null}
                  <strong id="campus-pin-title">{activeDisplay.title}</strong>
                  <div className="muted">{categoryRu[activeDisplay.category] ?? activeDisplay.category}</div>
                  {activeDisplay.description ? <p style={{ whiteSpace: "pre-wrap" }}>{activeDisplay.description}</p> : null}
                  {activeDisplay.floorLabel || activeDisplay.roomLabel ? (
                    <p className="muted">
                      {activeDisplay.floorLabel ? `Этаж: ${activeDisplay.floorLabel}` : null}
                      {activeDisplay.floorLabel && activeDisplay.roomLabel ? " · " : null}
                      {activeDisplay.roomLabel ? `Помещение: ${activeDisplay.roomLabel}` : null}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
