import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { AdminApiService } from "../api/AdminApiService.js";
import { CampusApiService, type CampusMarkerCategory, type MarkerDto } from "../api/CampusApiService.js";
import { StaticCampusMap } from "../campus/StaticCampusMap.js";

const adminApi = new AdminApiService(new ApiClient(""));
const campusApi = new CampusApiService(new ApiClient(""));
const categories: CampusMarkerCategory[] = ["QUIET", "FOOD", "STUDY", "RELAX", "SERVICE", "OTHER"];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = typeof reader.result === "string" ? reader.result : "";
      if (!s.startsWith("data:")) reject(new Error("Не удалось прочитать файл"));
      else resolve(s);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

export function AdminCampusPage() {
  const [markers, setMarkers] = useState<MarkerDto[]>([]);
  const [planImageUrl, setPlanImageUrl] = useState<string | undefined>();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CampusMarkerCategory>("QUIET");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [description, setDescription] = useState("");
  const [floorLabel, setFloorLabel] = useState("");
  const [roomLabel, setRoomLabel] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMarkers = useCallback(() => adminApi.markers().then((r) => setMarkers(r.markers)), []);

  const loadPlan = useCallback(async () => {
    const { imageUrl } = await campusApi.getPlanImage();
    setPlanImageUrl(imageUrl ?? undefined);
  }, []);

  useEffect(() => {
    void loadMarkers().catch(() => setErr("Не удалось загрузить точки"));
    void loadPlan().catch(() => undefined);
  }, [loadMarkers, loadPlan]);

  const visibleMarkers = markers.filter((m) => m.isActive !== false);

  async function uploadPlan(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { url } = await adminApi.upload({ kind: "map", filename: file.name, dataUrl });
      await adminApi.setCampusPlan(url);
      await loadPlan();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка загрузки плана");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await adminApi.createMarker({ title, category, x, y, description, floorLabel, roomLabel });
      setTitle("");
      setDescription("");
      await loadMarkers();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка сохранения");
    }
  }

  return (
    <div className="card">
      <header className="page-header">
        <h1>Админ: карта кампуса</h1>
        <Link to="/admin" className="text-link">
          Назад
        </Link>
      </header>
      {err ? <p className="error">{err}</p> : null}

      <section className="stack-gap" style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", margin: 0 }}>План кампуса</h2>
        <p className="muted" style={{ margin: 0 }}>
          Загрузите изображение схемы (PNG/JPG). Файл попадёт в папку загрузок backend и станет планом по умолчанию для
          публичной страницы «Кампус».
        </p>
        <div className="row" style={{ alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <label className="btn btn--ghost" style={{ cursor: busy ? "wait" : "pointer", margin: 0 }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadPlan(f);
              }}
            />
            {busy ? "Загрузка…" : "Выбрать файл плана"}
          </label>
          {planImageUrl ? (
            <span className="muted" style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
              Текущий: {planImageUrl}
            </span>
          ) : (
            <span className="muted">Пока используется запасная схема из фронтенда.</span>
          )}
        </div>
      </section>

      <div className="campus-map">
        <StaticCampusMap
          markers={visibleMarkers}
          planImageUrl={planImageUrl}
          editMode
          onMapClickPct={(px, py) => {
            const rx = Math.round(px * 10) / 10;
            const ry = Math.round(py * 10) / 10;
            setX(rx);
            setY(ry);
          }}
          onMarkerDragEnd={async (id, px, py) => {
            const rx = Math.round(px * 10) / 10;
            const ry = Math.round(py * 10) / 10;
            await adminApi.updateMarker(id, { x: rx, y: ry });
            await loadMarkers();
          }}
        />
      </div>

      <form onSubmit={(e) => void submit(e)} style={{ marginTop: "1rem" }}>
        <h2>Добавить точку</h2>
        <label>Название</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>Категория</label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as CampusMarkerCategory)}>
          {categories.map((c) => (
            <option key={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="row">
          <label>
            X %
            <input className="input" type="number" min={0} max={100} step={0.1} value={x} onChange={(e) => setX(Number(e.target.value))} />
          </label>
          <label>
            Y %
            <input className="input" type="number" min={0} max={100} step={0.1} value={y} onChange={(e) => setY(Number(e.target.value))} />
          </label>
        </div>
        <label>Описание</label>
        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label>Этаж</label>
        <input className="input" value={floorLabel} onChange={(e) => setFloorLabel(e.target.value)} />
        <label>Помещение</label>
        <input className="input" value={roomLabel} onChange={(e) => setRoomLabel(e.target.value)} />
        <button className="btn btn--primary" type="submit">
          Сохранить
        </button>
      </form>
      <h2 className="section-title">Список точек</h2>
      <ul className="journal-list">
        {markers.map((m) => (
          <li className="journal-item" key={m.id}>
            <strong>{m.title}</strong> <span className="muted">{m.category} · x:{m.x} y:{m.y}</span>
            <button type="button" className="btn btn--ghost" onClick={() => void adminApi.deleteMarker(m.id).then(loadMarkers)}>
              Скрыть
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
