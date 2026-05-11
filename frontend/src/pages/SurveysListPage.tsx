import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { SurveyApiService, type SurveyCatalogItem } from "../api/SurveyApiService.js";
import { WellbeingApiService, type WellbeingPointDto } from "../api/WellbeingApiService.js";
import { WellbeingChart } from "../journal/WellbeingChart.js";

const api = new ApiClient("");
const surveyApi = new SurveyApiService(api);
const wellbeingApi = new WellbeingApiService(api);

export function SurveysListPage() {
  const [items, setItems] = useState<SurveyCatalogItem[]>([]);
  const [monthly, setMonthly] = useState<WellbeingPointDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    surveyApi
      .catalog()
      .then((r) => setItems(r.surveys))
      .catch(() => setErr("Не удалось загрузить список опросов"));
  }, []);

  useEffect(() => {
    wellbeingApi.monthly().then((r) => setMonthly(r.points)).catch(() => undefined);
  }, []);

  return (
    <div className="card">
      <span className="badge badge--accent">Самонаблюдение</span>
      <h1>Опросники</h1>
      <p className="hero-lead">Три распространённые шкалы самонаблюдения (адаптированный текст). Результаты сохраняются в вашем аккаунте и отображаются на графиках.</p>
      {err ? <p className="error">{err}</p> : null}
      <div>
        {items.map((s) => (
          <Link key={s.key} to={`/surveys/${s.key}`} className="survey-row">
            <div className="survey-row__title">{s.title}</div>
            <div className="muted journal-item__meta">{s.description}</div>
          </Link>
        ))}
      </div>
      <h2 className="section-title">Динамика по опросникам и дневнику</h2>
      <p className="section-desc">Месячная статистика по тем же величинам: тревожность, депрессивность, активность и удовлетворенность.</p>
      <WellbeingChart data={monthly} />
      <Link to="/" className="text-link back-link">
        ← На главную
      </Link>
    </div>
  );
}
