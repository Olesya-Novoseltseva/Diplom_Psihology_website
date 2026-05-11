import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import {
  CampusApiService,
  type CampusMarkerCategory,
  type BuildingListDto,
  type MarkerDto,
} from "../api/CampusApiService.js";
import { StaticCampusMap } from "../campus/StaticCampusMap.js";

const api = new ApiClient("");
const campusApi = new CampusApiService(api);

const categoryRu: Record<CampusMarkerCategory, string> = {
  QUIET: "Тихое место",
  FOOD: "Еда",
  STUDY: "Учёба",
  RELAX: "Отдых",
  SERVICE: "Сервис",
  OTHER: "Другое",
};

export function CampusPage() {
  const [buildings, setBuildings] = useState<BuildingListDto[]>([]);
  const [markers, setMarkers] = useState<MarkerDto[]>([]);
  const [buildingId, setBuildingId] = useState<string>("");
  const [category, setCategory] = useState<CampusMarkerCategory | "">("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [planImageUrl, setPlanImageUrl] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    void campusApi
      .listBuildings()
      .then((r) => {
        if (!cancelled) setBuildings(r.buildings);
      })
      .catch(() => {
        if (!cancelled) setErr("Не удалось загрузить список зданий");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void campusApi
      .getPlanImage()
      .then(({ imageUrl }) => {
        if (!cancelled && imageUrl) setPlanImageUrl(imageUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setErr(null);
    void campusApi
      .listMarkers({
        buildingId: buildingId || undefined,
        category: category || undefined,
      })
      .then((r) => {
        if (!cancelled) setMarkers(r.markers);
      })
      .catch(() => {
        if (!cancelled) setErr("Не удалось загрузить точки на карте");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId, category]);

  const activeMarkers = useMemo(() => markers.filter((m) => m.isActive !== false), [markers]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>Кампус</h1>
        <Link to="/" className="text-link">
          На главную
        </Link>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Статичный план кампуса с полезными точками. Фильтры скрывают ненужные категории, а по клику открывается карточка локации.
      </p>

      {err ? <p className="error">{err}</p> : null}

      <div className="row" style={{ gap: "0.75rem", alignItems: "flex-end", marginTop: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="b">Здание</label>
          <select
            id="b"
            className="input"
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="">Все здания</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="c">Категория</label>
          <select
            id="c"
            className="input"
            value={category}
            onChange={(e) => setCategory((e.target.value || "") as CampusMarkerCategory | "")}
            style={{ marginBottom: 0 }}
          >
            <option value="">Все категории</option>
            {(Object.keys(categoryRu) as CampusMarkerCategory[]).map((k) => (
              <option key={k} value={k}>
                {categoryRu[k]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setBuildingId("");
            setCategory("");
          }}
          disabled={busy}
        >
          Сбросить
        </button>
      </div>

      <div className="campus-grid" style={{ marginTop: "0.9rem" }}>
        <div className="campus-map">
          <StaticCampusMap markers={activeMarkers} planImageUrl={planImageUrl} />
        </div>

        <div className="campus-side">
          <h2 style={{ fontSize: "1rem" }}>Точки ({activeMarkers.length})</h2>
          {busy ? <p className="muted">Загрузка…</p> : null}
          {activeMarkers.length === 0 && !busy ? <p className="muted">Ничего не найдено по фильтрам.</p> : null}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {activeMarkers.map((m) => (
              <li key={m.id} className="journal-item">
                <small className="muted">
                  {categoryRu[m.category]}
                  {m.buildingId ? " · здание задано" : ""}
                  {m.floorLabel ? ` · ${m.floorLabel}` : ""}
                  {m.roomLabel ? ` · ${m.roomLabel}` : ""}
                </small>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{m.title}</div>
                {m.description ? (
                  <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }} className="muted">
                    {m.description}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
