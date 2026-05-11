import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient, ApiError } from "../api/ApiClient.js";
import { JournalApiService, type JournalEntryDto } from "../api/JournalApiService.js";
import { WellbeingApiService, type WellbeingPointDto, type WellbeingSnapshotDto } from "../api/WellbeingApiService.js";
import { useAuth } from "../auth/AuthContext.js";
import { emotionRu } from "../journal/emotionLabels.js";
import { WellbeingChart } from "../journal/WellbeingChart.js";

const api = new ApiClient("");
const journalApi = new JournalApiService(api);
const wellbeingApi = new WellbeingApiService(api);

function fmt(d: string) {
  try {
    return new Date(d).toLocaleString("ru-RU");
  } catch {
    return d;
  }
}

export function JournalPage() {
  const { token, logout } = useAuth();
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WellbeingSnapshotDto | null>(null);
  const [points, setPoints] = useState<WellbeingPointDto[]>([]);
  const [nudge, setNudge] = useState(false);
  const [distress, setDistress] = useState(false);
  const [psych, setPsych] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentimentMode, setSentimentMode] = useState<"heuristic" | "openai" | null>(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((r) => r.json() as Promise<{ sentimentProvider?: string }>)
      .then((j) => {
        const s = j?.sentimentProvider;
        setSentimentMode(s === "openai" || s === "heuristic" ? s : null);
      })
      .catch(() => setSentimentMode(null));
  }, []);

  const load = useCallback(async () => {
    const { entries: list } = await journalApi.list(40);
    setEntries(list);
  }, []);

  const loadWellbeing = useCallback(async () => {
    const [current, daily] = await Promise.all([wellbeingApi.current(), wellbeingApi.daily()]);
    setSnapshot(current.snapshot);
    setPoints(daily.points);
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch(() => setErr("Не удалось загрузить записи"));
  }, [token, load]);

  useEffect(() => {
    if (!token) return;
    void loadWellbeing().catch(() => undefined);
  }, [token, loadWellbeing]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await journalApi.create(text.trim());
      setText("");
      setHint(res.assistantMessage);
      setSnapshot(res.wellbeingSnapshot ?? null);
      setNudge(res.negativeStreak);
      setDistress(res.distressStreak);
      setPsych(res.psychologistSuggested);
      await load();
      await loadWellbeing();
    } catch (er) {
      if (er instanceof ApiError && er.code === "LLM_UNAVAILABLE") {
        setErr(er.message);
      } else {
        setErr(er instanceof Error ? er.message : "Ошибка сохранения");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="card card--guest">
        <p className="muted">Чтобы вести дневник, войдите в аккаунт.</p>
        <div className="form-actions">
          <Link to="/login" className="btn btn--primary">
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <header className="page-header">
        <h1>Дневник</h1>
        <Link to="/" className="text-link">
          На главную
        </Link>
      </header>

      {sentimentMode === "openai" ? (
        <p className="lead-banner lead-banner--net">
          Анализ текста выполняется через внешний LLM-сервис (OpenAI-совместимый API). При сбоях сохранения проверьте доступность
          сервера модели и настройки <code>SENTIMENT_OPENAI_*</code> в backend.
        </p>
      ) : sentimentMode === "heuristic" ? (
        <p className="lead-banner lead-banner--local">Анализ записей — локальная эвристика, без обращения к сети.</p>
      ) : null}

      {hint ? (
        <div
          className={`callout callout--spaced callout--prewrap ${
            psych || distress || nudge ? "callout--warn" : "callout--info"
          }`}
        >
          {hint}
        </div>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="jtext">Запись</label>
        <textarea
          id="jtext"
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          required
        />
        {err ? <p className="error">{err}</p> : null}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </button>
        </div>
      </form>

      {snapshot ? (
        <>
          <h2 className="section-title">Текущие показатели</h2>
          <div className="metric-grid">
            <div className="metric-card">
              Уровень тревожности<strong>{snapshot.anxietyLevel}/100</strong>
            </div>
            <div className="metric-card">
              Уровень депрессивности<strong>{snapshot.depressionLevel}/100</strong>
            </div>
            <div className="metric-card">
              Активность<strong>{snapshot.activityLevel}/100</strong>
            </div>
            <div className="metric-card">
              Удовлетворенность<strong>{snapshot.satisfactionLevel}/100</strong>
            </div>
          </div>
          {snapshot.helpRecommended ? (
            <p className="callout callout--warn">
              Показатели самонаблюдения повышены. После добавления контактов поддержки здесь появятся конкретные способы обратиться за помощью.
            </p>
          ) : null}
        </>
      ) : null}

      <h2 className="section-title">Динамика</h2>
      <p className="section-desc">
        Шкала 0–100 показывает тревожность, депрессивность, активность и удовлетворенность по дневнику и опросникам.
      </p>
      <WellbeingChart data={points} />

      <h2 className="section-title">Недавние</h2>
      <ul className="journal-list">
        {entries.map((j) => (
          <li key={j.id} className="journal-item">
            <div className="journal-item__meta muted">
              {fmt(j.createdAt)} · {emotionRu(j.primaryEmotion)} · проблемность {Math.round(j.problemLevel * 100)}% ·{" "}
              {j.sentimentLabel} ({j.sentimentScore.toFixed(2)})
            </div>
            <div className="journal-item__body">{j.content}</div>
          </li>
        ))}
      </ul>

      <div className="card-foot">
        <button type="button" className="btn btn--ghost" onClick={logout}>
          Выйти
        </button>
      </div>
    </div>
  );
}
