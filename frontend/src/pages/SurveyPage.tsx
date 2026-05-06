import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { SurveyApiService, type SurveyDefinitionDto } from "../api/SurveyApiService.js";
import { useAuth } from "../auth/AuthContext.js";
import { monthlyAverages } from "../surveys/monthlyAvg.js";
import { ScoreLineChart } from "../surveys/ScoreLineChart.js";

const api = new ApiClient("");
const surveyApi = new SurveyApiService(api);

export function SurveyPage() {
  const { key = "" } = useParams();
  const { token } = useAuth();
  const [def, setDef] = useState<SurveyDefinitionDto | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<{ createdAt: string; score: number }[]>([]);

  const chartData = useMemo(() => monthlyAverages(attempts), [attempts]);

  const reloadHistory = useCallback(async () => {
    if (!token || !key) return;
    const a = await surveyApi.history(key);
    setAttempts(a.attempts);
  }, [key, token]);

  useEffect(() => {
    if (!key) return;
    if (!token) {
      setErr("Войдите, чтобы проходить опрос и видеть график.");
      return;
    }
    setErr(null);
    surveyApi
      .definition(key)
      .then((d) => {
        setDef(d);
        setAnswers(d.questions.map(() => 0));
      })
      .catch(() => setErr("Не удалось загрузить опрос"));
    void reloadHistory().catch(() => {});
  }, [key, token, reloadHistory]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !def) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await surveyApi.submit(def.key, answers);
      setMsg(r.interpretation);
      await reloadHistory();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Ошибка отправки");
    } finally {
      setBusy(false);
    }
  }

  if (!key) {
    return (
      <div className="card">
        <p className="muted">Не указан опрос.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>{def?.title ?? "Загрузка…"}</h1>
        <Link to="/surveys" className="text-link">
          К списку
        </Link>
      </div>
      {def ? <p className="muted">{def.description}</p> : null}
      {err ? <p className="error">{err}</p> : null}
      {msg ? <div className="callout callout--soft">{msg}</div> : null}

      {token && def ? (
        <form onSubmit={(e) => void onSubmit(e)}>
          {def.sharedOptionLabels && def.sharedOptionLabels.length === def.questions[0]!.max - def.questions[0]!.min + 1 ? (
            <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "0.75rem" }}>
              Шкала ответов:{" "}
              {def.sharedOptionLabels.map((lab, idx) => (
                <span key={lab}>
                  <strong>{def.questions[0]!.min + idx}</strong> — {lab}
                  {idx < def.sharedOptionLabels!.length - 1 ? "; " : ""}
                </span>
              ))}
            </p>
          ) : null}
          {def.questions.map((q, i) => (
            <fieldset key={q.id} className="quiz-fieldset">
              <legend>{q.text}</legend>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {Array.from({ length: q.max - q.min + 1 }, (_, j) => q.min + j).map((v) => {
                  const lab = def.sharedOptionLabels?.[v - q.min];
                  return (
                    <label key={v} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[i] === v}
                        onChange={() => {
                          const next = [...answers];
                          next[i] = v;
                          setAnswers(next);
                        }}
                      />
                      <span>
                        <strong>{v}</strong>
                        {lab ? ` — ${lab}` : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Отправка…" : "Сохранить результат"}
          </button>
        </form>
      ) : null}

      <h2 style={{ fontSize: "1rem", marginTop: "1.25rem" }}>Динамика по месяцам</h2>
      <p className="muted">
        Если за месяц несколько прохождений — точка показывает средний суммарный балл за месяц. Диапазон суммы по этому опросу:{" "}
        {def ? (
          <>
            {def.scoreMin}…{def.scoreMax}
          </>
        ) : (
          "—"
        )}
        .
      </p>
      {def?.scoreBandsHint ? (
        <div className="callout callout--info" style={{ fontSize: "0.88rem", marginBottom: "0.65rem" }}>
          {def.scoreBandsHint}
        </div>
      ) : null}
      <ScoreLineChart data={chartData} yMax={def?.scoreMax} />
    </div>
  );
}
