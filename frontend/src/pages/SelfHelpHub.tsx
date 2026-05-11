import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { SelfHelpApiService } from "../api/SelfHelpApiService.js";

const selfHelpApi = new SelfHelpApiService(new ApiClient(""));

export function SelfHelpHub() {
  const [topics, setTopics] = useState<Array<{ slug: string; title: string; summary: string }>>([]);

  useEffect(() => {
    selfHelpApi.list().then((r) => setTopics(r.topics)).catch(() => setTopics([]));
  }, []);

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Самопомощь</h1>
      <p className="muted">
        Короткие техники для снятия напряжения и самоорганизации. Выберите тему ниже.
      </p>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}>
        {topics.map((t) => (
          <Link key={t.slug} to={`/help/${t.slug}`} className="survey-row" style={{ display: "block" }}>
            <div className="survey-row__title">{t.title}</div>
            <div className="muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
              {t.summary}
            </div>
          </Link>
        ))}
      </div>

      <div className="callout callout--info" style={{ marginTop: "1rem" }}>
        Дневник с мягкими подсказками — в разделе{" "}
        <Link to="/journal" className="text-link">
          «Дневник»
        </Link>
        .
      </div>

      <p style={{ marginTop: "1rem" }}>
        <Link to="/" className="text-link">
          ← На главную
        </Link>
      </p>
    </div>
  );
}
