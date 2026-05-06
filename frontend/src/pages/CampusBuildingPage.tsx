import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { CampusApiService, type BuildingListDto, type FloorDto } from "../api/CampusApiService.js";

const api = new ApiClient("");
const campusApi = new CampusApiService(api);

export function CampusBuildingPage() {
  const { slug = "" } = useParams();
  const [building, setBuilding] = useState<BuildingListDto | null>(null);
  const [floors, setFloors] = useState<FloorDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let on = true;
    void (async () => {
      try {
        const bundle = await campusApi.getBuilding(slug);
        if (!on) return;
        setBuilding(bundle.building);
        setFloors(bundle.floors);
        setErr(null);
      } catch {
        if (!on) return;
        setErr("Корпус не найден или ошибка загрузки.");
        setBuilding(null);
        setFloors([]);
      }
    })();
    return () => {
      on = false;
    };
  }, [slug]);

  if (!slug) {
    return (
      <div className="card">
        <p className="muted">Не указан корпус.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0 }}>{building?.name ?? "Загрузка…"}</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {building?.slug}
          </p>
        </div>
        <Link to="/campus" className="text-link">
          К карте
        </Link>
      </div>
      {building?.description ? <p className="muted">{building.description}</p> : null}
      {building?.addressNote ? <div className="callout callout--info">{building.addressNote}</div> : null}
      {err ? <p className="error">{err}</p> : null}

      <h2 style={{ fontSize: "1rem", marginTop: "1rem" }}>Этажи</h2>
      <p className="muted" style={{ fontSize: "0.9rem" }}>
        Схему этажа можно добавить ссылкой на изображение в базе (поле planImageUrl). Пока пусто — пришлите файлы или URL в
        следующем сообщении.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {floors.map((f) => (
          <li key={f.id} className="journal-item">
            <strong>{f.label ?? `Уровень ${f.levelIndex + 1}`}</strong>
            {f.planImageUrl ? (
              <div style={{ marginTop: "0.35rem" }}>
                <a href={f.planImageUrl} target="_blank" rel="noreferrer" className="text-link">
                  Открыть схему
                </a>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
                Схема не загружена
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
