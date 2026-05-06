import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ApiClient } from "../api/ApiClient.js";
import {
  CampusApiService,
  type CampusMarkerCategory,
  type BuildingListDto,
  type MarkerDto,
} from "../api/CampusApiService.js";

const api = new ApiClient("");
const campusApi = new CampusApiService(api);

const DEFAULT_CENTER: [number, number] = [59.8772, 30.2186];

const categoryRu: Record<CampusMarkerCategory, string> = {
  QUIET: "Тихое место",
  FOOD: "Еда",
  STUDY: "Учёба",
  RELAX: "Отдых",
  SERVICE: "Сервис",
  OTHER: "Другое",
};

// Исправление “пустых” маркеров Leaflet в Vite/ESM
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
});

export function CampusPage() {
  const [buildings, setBuildings] = useState<BuildingListDto[]>([]);
  const [markers, setMarkers] = useState<MarkerDto[]>([]);
  const [buildingId, setBuildingId] = useState<string>("");
  const [category, setCategory] = useState<CampusMarkerCategory | "">("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const center = useMemo<[number, number]>(() => {
    const m = markers[0];
    return m ? [m.lat, m.lng] : DEFAULT_CENTER;
  }, [markers]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>Кампус</h1>
        <Link to="/" className="text-link">
          На главную
        </Link>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Карта с полезными точками (тихие места, еда, сервис). Данные пока демо — можно расширять через сид/админку.
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
          <MapContainer center={center} zoom={16} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((m) => (
              <Marker key={m.id} position={[m.lat, m.lng]}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700 }}>{m.title}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {categoryRu[m.category]}
                    </div>
                    {m.description ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{m.description}</div> : null}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="campus-side">
          <h2 style={{ fontSize: "1rem" }}>Точки ({markers.length})</h2>
          {busy ? <p className="muted">Загрузка…</p> : null}
          {markers.length === 0 && !busy ? <p className="muted">Ничего не найдено по фильтрам.</p> : null}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {markers.map((m) => (
              <li key={m.id} className="journal-item">
                <small className="muted">
                  {categoryRu[m.category]}
                  {m.buildingId ? " · здание задано" : ""}
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
