import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import type { MarkerDto } from "../api/CampusApiService.js";
import type { MapViewTransform } from "./campusMapViewMath.js";
import { clientToLayerPercent, fitLayerInViewport, wheelZoomTowardPoint } from "./campusMapViewMath.js";

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

const IDENTITY_TRANSFORM: MapViewTransform = { scale: 1, tx: 0, ty: 0 };

type Props = {
  markers: MarkerDto[];
  planImageUrl?: string;
  editMode?: boolean;
  onMarkerDragEnd?: (id: string, x: number, y: number) => void | Promise<void>;
  onMapClickPct?: (x: number, y: number) => void;
};

export function StaticCampusMap({
  markers,
  planImageUrl = "/campus-plan-placeholder.svg",
  editMode = false,
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
    const vp = viewportRef.current;
    if (!vp) return;

    const onWheel = (e: WheelEvent) => {
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

  function handleBackgroundPointerDown(pe: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode || !onMapClickPct || !viewportRef.current) return;
    if ((pe.target as HTMLElement).closest(".static-campus-map__pin")) return;
    if ((pe.target as HTMLElement).closest(".static-campus-map__popup")) return;

    const p = pctFromClient(pe.clientX, pe.clientY);
    if (p) onMapClickPct(p.x, p.y);
  }

  const activeMarker = activeId ? markers.find((mk) => mk.id === activeId) : null;

  let activeDisplay: (MarkerDto & { x: number; y: number }) | null = null;
  if (activeMarker) {
    const pv = preview[activeMarker.id];
    activeDisplay = pv ? { ...activeMarker, ...pv } : activeMarker;
  }

  return (
    <div
      className={`static-campus-map${editMode ? " static-campus-map--edit" : ""}${dragBusy ? " static-campus-map--dragging" : ""}`}
      aria-label={editMode ? "Карта: перетаскивание точек, колёсико масштаб." : "Карта кампуса. Масштаб — колёсико мыши."}
    >
      {editMode ? (
        <p className="static-campus-map__edit-hint">
          Перетаскивание точки по схеме. Клик по плану задаёт координаты новой точки для формы ниже. Колёсико мыши — приблизить /
          отдалить.
        </p>
      ) : null}
      <div
        ref={viewportRef}
        className="static-campus-map__viewport"
        onPointerDown={handleBackgroundPointerDown}
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
                  className="static-campus-map__pin"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, backgroundColor: color(m.category), touchAction: "none" }}
                  title={m.title}
                  onPointerDown={(e) => startPinInteraction(e, m)}
                />
              );
            })}
            {activeDisplay && interactionKind !== "dragging" ? (
              <div
                className="static-campus-map__popup"
                style={{ left: `${Math.min(activeDisplay.x, 72)}%`, top: `${Math.min(activeDisplay.y + 3, 72)}%` }}
                onPointerDown={(pointerEv) => pointerEv.stopPropagation()}
                role="dialog"
                aria-labelledby="campus-pin-title"
              >
                <button type="button" className="static-campus-map__close" onClick={() => setActiveId(null)}>
                  ×
                </button>
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
