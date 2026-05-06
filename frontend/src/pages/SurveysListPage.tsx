import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { SurveyApiService, type SurveyCatalogItem } from "../api/SurveyApiService.js";

const api = new ApiClient("");
const surveyApi = new SurveyApiService(api);

export function SurveysListPage() {
  const [items, setItems] = useState<SurveyCatalogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    surveyApi
      .catalog()
      .then((r) => setItems(r.surveys))
      .catch(() => setErr("Не удалось загрузить список опросов"));
  }, []);

  return (
    <div className="card">
      <span className="badge" style={{ marginBottom: "0.35rem" }}>
        Самонаблюдение
      </span>
      <h1>Опросники</h1>
      <p className="muted">Три распространённые шкалы самонаблюдения (адаптированный текст). Результаты сохраняются в вашем аккаунте и отображаются на графиках.</p>
      {err ? <p className="error">{err}</p> : null}
      <div style={{ marginTop: "0.75rem" }}>
        {items.map((s) => (
          <Link key={s.key} to={`/surveys/${s.key}`} className="survey-row">
            <div className="survey-row__title">{s.title}</div>
            <div className="muted" style={{ marginTop: "0.25rem" }}>
              {s.description}
            </div>
          </Link>
        ))}
      </div>
      <p style={{ marginTop: "1rem" }}>
        <Link to="/" className="text-link">
          ← На главную
        </Link>
      </p>
    </div>
  );
}
