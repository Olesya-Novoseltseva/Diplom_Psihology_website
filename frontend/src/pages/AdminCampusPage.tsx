import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { AdminApiService } from "../api/AdminApiService.js";
import { CampusApiService, type CampusMarkerCategory, type MarkerDto } from "../api/CampusApiService.js";
import { StaticCampusMap } from "../campus/StaticCampusMap.js";

const adminApi = new AdminApiService(new ApiClient(""));
const campusApi = new CampusApiService(new ApiClient(""));

const categories: CampusMarkerCategory[] = ["QUIET", "FOOD", "STUDY", "RELAX", "SERVICE", "OTHER"];

const categoryRu: Record<CampusMarkerCategory, string> = {
  QUIET: "Тихое место",
  FOOD: "Еда",
  STUDY: "Учёба",
  RELAX: "Отдых",
  SERVICE: "Сервис",
  OTHER: "Другое",
};

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

function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function AdminCampusMarkerPanel(props: {
  marker: MarkerDto;
  onClose: () => void;
  reload: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const { marker, onClose, reload, onError } = props;
  const [title, setTitle] = useState(marker.title);
  const [category, setCategory] = useState(marker.category);
  const [description, setDescription] = useState(marker.description ?? "");
  const [floorLabel, setFloorLabel] = useState(marker.floorLabel ?? "");
  const [roomLabel, setRoomLabel] = useState(marker.roomLabel ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(marker.title);
    setCategory(marker.category);
    setDescription(marker.description ?? "");
    setFloorLabel(marker.floorLabel ?? "");
    setRoomLabel(marker.roomLabel ?? "");
  }, [marker.id, marker.title, marker.category, marker.description, marker.floorLabel, marker.roomLabel, marker.imageUrl]);

  async function saveMeta(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    try {
      await adminApi.updateMarker(marker.id, {
        title: title.trim(),
        category,
        description: description.trim() || null,
        floorLabel: floorLabel.trim() || null,
        roomLabel: roomLabel.trim() || null,
      });
      await reload();
    } catch {
      onError("Не удалось сохранить изменения");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { url } = await adminApi.upload({ kind: "campus", filename: file.name, dataUrl });
      await adminApi.updateMarker(marker.id, { imageUrl: url });
      await reload();
    } catch {
      onError("Не удалось загрузить фото");
    } finally {
      setBusy(false);
    }
  }

  async function clearPhoto() {
    if (!window.confirm("Убрать фото у этой точки?")) return;
    setBusy(true);
    try {
      await adminApi.updateMarker(marker.id, { imageUrl: null });
      await reload();
    } catch {
      onError("Не удалось убрать фото");
    } finally {
      setBusy(false);
    }
  }

  async function removeMarker() {
    if (!window.confirm(`Удалить точку «${marker.title}» со карты? Для посетителей она пропадёт.`)) return;
    setBusy(true);
    try {
      await adminApi.deleteMarker(marker.id);
      await reload();
      onClose();
    } catch {
      onError("Не удалось удалить точку");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-marker-panel" onSubmit={(ev) => void saveMeta(ev)}>
      <div className="admin-marker-panel__title" id="campus-admin-pin-title">
        Редактирование
      </div>
      {marker.imageUrl ? <img src={marker.imageUrl} alt="" className="admin-marker-preview" /> : null}

      <label htmlFor={`pin-${marker.id}-title`}>Название</label>
      <input
        id={`pin-${marker.id}-title`}
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        disabled={busy}
      />

      <label htmlFor={`pin-${marker.id}-cat`}>Категория</label>
      <select
        id={`pin-${marker.id}-cat`}
        className="input"
        value={category}
        onChange={(e) => setCategory(e.target.value as CampusMarkerCategory)}
        disabled={busy}
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {categoryRu[c]}
          </option>
        ))}
      </select>

      <label htmlFor={`pin-${marker.id}-desc`}>Описание</label>
      <textarea
        id={`pin-${marker.id}-desc`}
        className="input"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Что здесь есть, как воспользоваться…"
        disabled={busy}
      />

      <div className="admin-marker-actions" style={{ marginTop: "0.5rem" }}>
        <span className="muted" style={{ fontSize: "0.82rem", width: "100%" }}>
          Фото в карточке точки
        </span>
        <label className="btn btn--ghost btn--compact" style={{ margin: 0, cursor: busy ? "wait" : "pointer" }}>
          <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} disabled={busy} onChange={(e) => void onPhoto(e)} />
          {busy ? "…" : marker.imageUrl ? "Заменить" : "Загрузить"}
        </label>
        {marker.imageUrl ? (
          <button type="button" className="btn btn--ghost btn--compact" disabled={busy} onClick={() => void clearPhoto()}>
            Убрать фото
          </button>
        ) : null}
      </div>

      <label htmlFor={`pin-${marker.id}-floor`}>Этаж</label>
      <input
        id={`pin-${marker.id}-floor`}
        className="input"
        value={floorLabel}
        onChange={(e) => setFloorLabel(e.target.value)}
        disabled={busy}
      />
      <label htmlFor={`pin-${marker.id}-room`}>Помещение</label>
      <input
        id={`pin-${marker.id}-room`}
        className="input"
        value={roomLabel}
        onChange={(e) => setRoomLabel(e.target.value)}
        disabled={busy}
      />

      <div className="admin-marker-actions">
        <button className="btn btn--primary" type="submit" disabled={busy}>
          Сохранить текст и метки
        </button>
        <button type="button" className="btn btn--danger btn--compact" disabled={busy} onClick={() => void removeMarker()}>
          Удалить точку
        </button>
      </div>
      <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
        Положение на схеме меняется перетаскиванием маркера.
      </p>
    </form>
  );
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

  const loadMarkers = useCallback(async (): Promise<void> => {
    const r = await adminApi.markers();
    setMarkers(r.markers);
  }, []);

  const loadPlan = useCallback(async () => {
    const { imageUrl } = await campusApi.getPlanImage();
    setPlanImageUrl(imageUrl ?? undefined);
  }, []);

  useEffect(() => {
    void loadMarkers().catch(() => setErr("Не удалось загрузить точки"));
    void loadPlan().catch(() => undefined);
  }, [loadMarkers, loadPlan]);

  const visibleMarkers = markers.filter((m) => m.isActive === true);

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

  async function removeMarkerFromList(m: MarkerDto) {
    if (!window.confirm(`Удалить точку «${m.title}» со карты? Для посетителей она пропадёт.`)) return;
    setErr(null);
    try {
      await adminApi.deleteMarker(m.id);
      await loadMarkers();
    } catch {
      setErr("Не удалось удалить точку");
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
          adminPinPanel={(m, dismiss) => (
            <AdminCampusMarkerPanel
              key={m.id}
              marker={m}
              onClose={dismiss}
              reload={loadMarkers}
              onError={(msg) => setErr(msg)}
            />
          )}
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
            <option key={c} value={c}>
              {categoryRu[c]}
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
          <li className="journal-item admin-marker-list-row" key={m.id}>
            <div className="admin-marker-list-row__body">
              <strong>{m.title}</strong>{" "}
              <span className="muted">
                {categoryRu[m.category]} · x:{m.x} y:{m.y}
                {m.isActive === false ? " · скрыта" : ""}
              </span>
            </div>
            <button
              type="button"
              className="btn btn--icon-only"
              title="Удалить со карты"
              aria-label={`Удалить точку ${m.title}`}
              onClick={() => void removeMarkerFromList(m)}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
