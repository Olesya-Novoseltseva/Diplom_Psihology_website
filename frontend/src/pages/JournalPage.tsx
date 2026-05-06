import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { JournalApiService, type JournalEntryDto } from "../api/JournalApiService.js";
import { useAuth } from "../auth/AuthContext.js";
import { emotionRu } from "../journal/emotionLabels.js";
import { buildJournalTrendPoints } from "../journal/buildJournalTrendPoints.js";
import { JournalTrendChart } from "../journal/JournalTrendChart.js";

const api = new ApiClient("");
const journalApi = new JournalApiService(api);

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
  const [nudge, setNudge] = useState(false);
  const [distress, setDistress] = useState(false);
  const [psych, setPsych] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { entries: list } = await journalApi.list(40);
    setEntries(list);
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch(() => setErr("Не удалось загрузить записи"));
  }, [token, load]);

  const trendPoints = useMemo(() => buildJournalTrendPoints(entries), [entries]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await journalApi.create(text.trim());
      setText("");
      setHint(res.assistantMessage);
      setNudge(res.negativeStreak);
      setDistress(res.distressStreak);
      setPsych(res.psychologistSuggested);
      await load();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="card">
        <p className="muted">Чтобы вести дневник, войдите в аккаунт.</p>
        <Link to="/login" className="btn btn--primary" style={{ marginTop: "0.5rem", display: "inline-flex" }}>
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>Дневник</h1>
        <Link to="/" className="text-link">
          На главную
        </Link>
      </div>

      {hint ? (
        <div
          className={psych || distress || nudge ? "callout callout--warn" : "callout callout--info"}
          style={{ marginBottom: "0.75rem", whiteSpace: "pre-wrap" }}
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
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Сохраняю…" : "Сохранить"}
        </button>
      </form>

      <h2 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Динамика</h2>
      <p className="muted" style={{ fontSize: "0.9rem" }}>
        По горизонтали — дата записи; линии показывают тональность (−1…1) и проблемность (0–100%).
      </p>
      <JournalTrendChart data={trendPoints} />

      <h2 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Недавние</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {entries.map((j) => (
          <li key={j.id} className="journal-item">
            <small className="muted">
              {fmt(j.createdAt)} · {emotionRu(j.primaryEmotion)} · проблемность {Math.round(j.problemLevel * 100)}% ·{" "}
              {j.sentimentLabel} ({j.sentimentScore.toFixed(2)})
            </small>
            <div style={{ marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>{j.content}</div>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn--ghost" onClick={logout}>
          Выйти
        </button>
      </p>
    </div>
  );
}
