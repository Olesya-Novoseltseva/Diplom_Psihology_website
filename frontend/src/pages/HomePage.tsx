import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { JournalApiService, type JournalEntryDto } from "../api/JournalApiService.js";
import { SurveyApiService, type SurveyCatalogItem } from "../api/SurveyApiService.js";
import { useAuth } from "../auth/AuthContext.js";
import { emotionRu } from "../journal/emotionLabels.js";

const api = new ApiClient("");
const journalApi = new JournalApiService(api);
const surveyApi = new SurveyApiService(api);

const NOTICE_GUEST =
  "При острой опасности для жизни и здоровья используйте экстренную помощь (112). Контент сервиса — самонаблюдение и поддержка студента в вузе.";

function fmt(d: string) {
  try {
    return new Date(d).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return d;
  }
}

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

type SurveyWithLast = SurveyCatalogItem & {
  lastScore?: number;
  lastAt?: string;
};

export function HomePage() {
  const { user, loading, token, logout } = useAuth();
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [surveys, setSurveys] = useState<SurveyWithLast[]>([]);
  const [dashErr, setDashErr] = useState<string | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setDashLoading(true);
    setDashErr(null);
    try {
      const [{ entries: j }, { surveys: cat }] = await Promise.all([journalApi.list(5), surveyApi.catalog()]);

      setEntries(j);

      const withLast = await Promise.all(
        cat.map(async (s) => {
          try {
            const { attempts } = await surveyApi.history(s.key);
            const a = attempts[0];
            if (!a) return { ...s };
            return { ...s, lastScore: a.score, lastAt: a.createdAt };
          } catch {
            return { ...s };
          }
        }),
      );
      setSurveys(withLast);
    } catch {
      setDashErr("Не удалось загрузить сводку. Попробуйте обновить страницу.");
    } finally {
      setDashLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setEntries([]);
      setSurveys([]);
      setDashErr(null);
      return;
    }
    void loadDashboard();
  }, [token, loadDashboard]);

  if (loading) {
    return (
      <div className="card">
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card">
        <h1>Платформа психологической поддержки (MVP)</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Безопасное место для дневника, коротких опросов самонаблюдения, материалов самопомощи и навигации по кампусу.
        </p>
        <p className="muted" style={{ marginTop: "0.65rem", fontSize: "0.9rem" }}>
          {NOTICE_GUEST}
        </p>
        <div className="row" style={{ marginTop: "0.85rem" }}>
          <Link to="/login" className="btn btn--primary">
            Войти
          </Link>
          <Link to="/register" className="btn btn--secondary">
            Регистрация
          </Link>
        </div>
        <p className="muted" style={{ marginTop: "0.9rem" }}>
          Без входа доступны <Link to="/help">самопомощь</Link> и <Link to="/campus">карта кампуса</Link>. Список опросов открыт, чтобы посмотреть форму; сохранение результата — после{" "}
          <Link to="/login" className="text-link">
            входа
          </Link>
          .
        </p>
        <div className="row" style={{ marginTop: "0.35rem" }}>
          <Link to="/help" className="btn btn--ghost">
            Самопомощь
          </Link>
          <Link to="/campus" className="btn btn--ghost">
            Кампус
          </Link>
          <Link to="/surveys" className="btn btn--ghost">
            Опросники
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Личный кабинет</h1>
      <p style={{ marginTop: 0 }}>
        Вы вошли как <strong>{user.email}</strong>
        {dashLoading ? <span className="muted"> · загрузка сводки…</span> : null}
      </p>
      {dashErr ? <p className="error">{dashErr}</p> : null}

      <h2 style={{ marginTop: "1.1rem" }}>Быстрые действия</h2>
      <div className="row" style={{ marginTop: "0.35rem" }}>
        <Link to="/journal" className="btn btn--primary">
          Дневник
        </Link>
        <Link to="/surveys" className="btn btn--secondary">
          Опросники
        </Link>
        <Link to="/help" className="btn btn--secondary">
          Самопомощь
        </Link>
        <Link to="/campus" className="btn btn--secondary">
          Кампус
        </Link>
        <button type="button" className="btn btn--ghost" onClick={logout}>
          Выйти
        </button>
      </div>

      <h2 style={{ marginTop: "1.15rem" }}>Последние записи дневника</h2>
      {entries.length === 0 && !dashLoading ? (
        <p className="muted" style={{ marginTop: 0 }}>
          Пока нет записей.{" "}
          <Link to="/journal" className="text-link">
            Сделайте короткую заметку
          </Link>{" "}
          о состоянии — можно в несколько предложений.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0.35rem 0 0" }}>
          {entries.map((j) => (
            <li key={j.id} className="journal-item">
              <small className="muted">
                {fmt(j.createdAt)} · {emotionRu(j.primaryEmotion)} · проблемность {Math.round(j.problemLevel * 100)}%
                {j.suggestPsychologist ? " · просьба обратить внимание" : ""}
              </small>
              <div style={{ marginTop: "0.3rem" }}>{truncate(j.content, 200)}</div>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: "1.15rem" }}>Опросники</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Последний сохранённый балл по каждому опросу:
      </p>
      {surveys.length === 0 && !dashLoading ? (
        <p className="muted">Список опросов пуст. Добавьте опросники в настройках приложения (backend).</p>
      ) : (
        <div style={{ marginTop: "0.5rem" }}>
          {surveys.map((s) => (
            <Link key={s.key} to={`/surveys/${encodeURIComponent(s.key)}`} className="survey-row">
              <div className="survey-row__title">{s.title}</div>
              <div className="muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
                {s.lastAt != null && s.lastScore != null ? (
                  <>
                    Последний балл: <strong>{s.lastScore.toFixed(0)}</strong> ({fmt(s.lastAt)})
                  </>
                ) : (
                  <>Ещё не проходили — откройте и сохраните результат</>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
