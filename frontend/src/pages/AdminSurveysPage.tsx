import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import {
  AdminApiService,
  type AdminSurveyDto,
  type AdminSurveyInput,
} from "../api/AdminApiService.js";

const adminApi = new AdminApiService(new ApiClient(""));

const DEFAULT_OPTION_LABELS = ["Совсем нет", "Иногда", "Часто", "Почти всегда"];

const DEFAULT_SCORE_BANDS: Array<{ min: number; max: number; label: string; text: string }> = [
  { min: 0, max: 4, label: "низко", text: "Низкий уровень по самоопроснику." },
  { min: 5, max: 9, label: "умеренно", text: "Умеренный уровень; полезно самонаблюдение и профилактика." },
  { min: 10, max: 999, label: "высоко", text: "Высокий уровень; имеет смысл обратиться за очной поддержкой." },
];

export type SurveyFormModel = {
  key: string;
  title: string;
  description: string;
  optionLabelsLines: string;
  scoreBands: Array<{ min: number; max: number; label: string; text: string }>;
  questions: Array<{ text: string; min: number; max: number; reverseScore: boolean }>;
  isActive: boolean;
  sortOrder: number;
};

function coerceLabels(v: unknown): string[] {
  if (Array.isArray(v) && v.length) return v.map((x) => String(x));
  return [...DEFAULT_OPTION_LABELS];
}

function coerceScoreBands(v: unknown): Array<{ min: number; max: number; label: string; text: string }> {
  if (!Array.isArray(v) || !v.length) return DEFAULT_SCORE_BANDS.map((b) => ({ ...b }));
  const out: Array<{ min: number; max: number; label: string; text: string }> = [];
  for (const row of v) {
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      out.push({
        min: Number(o.min ?? 0) || 0,
        max: Number(o.max ?? 0) || 0,
        label: String(o.label ?? ""),
        text: String(o.text ?? ""),
      });
    }
  }
  return out.length ? out : DEFAULT_SCORE_BANDS.map((b) => ({ ...b }));
}

function dtoToForm(s: AdminSurveyDto): SurveyFormModel {
  const labels = coerceLabels(s.sharedOptionLabels);
  return {
    key: s.key,
    title: s.title,
    description: s.description,
    optionLabelsLines: labels.join("\n"),
    scoreBands: coerceScoreBands(s.scoreBands),
    questions: s.questions
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((q) => ({
        text: q.text,
        min: q.min,
        max: q.max,
        reverseScore: q.reverseScore ?? false,
      })),
    isActive: s.isActive,
    sortOrder: s.sortOrder,
  };
}

function formToPayload(f: SurveyFormModel): AdminSurveyInput {
  const sharedOptionLabels = f.optionLabelsLines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    key: f.key.trim(),
    title: f.title.trim(),
    description: f.description.trim(),
    sharedOptionLabels: sharedOptionLabels.length ? sharedOptionLabels : undefined,
    scoreBands: f.scoreBands.map((b) => ({ ...b })),
    questions: f.questions.map((q) => ({
      text: q.text.trim(),
      min: q.min,
      max: Math.max(q.min + 1, q.max),
      reverseScore: q.reverseScore,
    })),
    isActive: f.isActive,
    sortOrder: f.sortOrder,
  };
}

const emptyForm = (): SurveyFormModel => ({
  key: "",
  title: "",
  description: "",
  optionLabelsLines: DEFAULT_OPTION_LABELS.join("\n"),
  scoreBands: DEFAULT_SCORE_BANDS.map((b) => ({ ...b })),
  questions: [{ text: "", min: 0, max: 3, reverseScore: false }],
  isActive: true,
  sortOrder: 0,
});

export function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<AdminSurveyDto[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** null — только список; 'new' или id — редактор */
  const [editorTarget, setEditorTarget] = useState<"new" | string | null>(null);
  const [form, setForm] = useState<SurveyFormModel>(() => emptyForm());

  const load = useCallback(async () => {
    const r = await adminApi.surveys();
    setSurveys(r.surveys);
  }, []);

  useEffect(() => {
    void load().catch(() => setErr("Не удалось загрузить опросники"));
  }, [load]);

  useEffect(() => {
    if (editorTarget === "new") {
      setForm(emptyForm());
      return;
    }
    if (editorTarget) {
      const s = surveys.find((x) => x.id === editorTarget);
      if (s) setForm(dtoToForm(s));
    }
  }, [editorTarget, surveys]);

  function openCreate() {
    setErr(null);
    setEditorTarget("new");
    setForm(emptyForm());
  }

  function openEdit(s: AdminSurveyDto) {
    setErr(null);
    setEditorTarget(s.id);
    setForm(dtoToForm(s));
  }

  function closeEditor() {
    setEditorTarget(null);
    setErr(null);
  }

  async function saveSurvey(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.questions.length || form.questions.some((q) => !q.text.trim())) {
      setErr("Заполните текст каждого вопроса (минимум один).");
      return;
    }
    setBusy(true);
    try {
      const payload = formToPayload(form);
      if (editorTarget === "new") await adminApi.createSurvey(payload);
      else if (editorTarget) await adminApi.updateSurvey(editorTarget, payload);
      await load();
      closeEditor();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function hideSurvey(s: AdminSurveyDto) {
    const act = s.isActive ? "скрыть с сайта" : "вернуть в каталог";
    if (!window.confirm(`Действительно ${act} опросник «${s.title}»?`)) return;
    setErr(null);
    try {
      await adminApi.updateSurvey(s.id, { isActive: !s.isActive });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка обновления");
    }
  }

  async function removeSurveySoft(s: AdminSurveyDto) {
    if (!window.confirm(`Скрыть опросник «${s.title}» (isActive=false)? Публичный список его не покажет.`)) return;
    setErr(null);
    try {
      await adminApi.deleteSurvey(s.id);
      await load();
      if (editorTarget === s.id) closeEditor();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка");
    }
  }

  const sortedList = useMemo(
    () => [...surveys].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru")),
    [surveys],
  );

  return (
    <div className="card">
      <header className="page-header">
        <h1>Опросники</h1>
        <Link to="/admin" className="text-link">
          Назад
        </Link>
      </header>
      <p className="muted" style={{ marginTop: 0 }}>
        Список всех опросников: редактирование вопросов, шкал и интерпретации баллов. Новый опросник — отдельной кнопкой.
      </p>
      {err ? <p className="error">{err}</p> : null}

      <div className="admin-toolbar">
        <button type="button" className="btn btn--primary" disabled={busy} onClick={() => openCreate()}>
          + Новый опросник
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void load()}>
          Обновить список
        </button>
      </div>

      {editorTarget ? (
        <section className="admin-editor-panel">
          <div className="admin-editor-panel__head">
            <h2 className="admin-editor-panel__title">{editorTarget === "new" ? "Создание опросника" : "Редактирование"}</h2>
            <button type="button" className="btn btn--ghost" onClick={() => closeEditor()} disabled={busy}>
              Закрыть
            </button>
          </div>
          <form className="admin-editor-form" onSubmit={(e) => void saveSurvey(e)}>
            <fieldset className="quiz-fieldset">
              <legend>Основное</legend>
              <label>Ключ URL (латиница, цифры, -_)</label>
              <input
                className="input"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                pattern="^[a-z0-9_-]{2,}$"
                placeholder="например phq9"
                required
                title="Используется в адресе /surveys/ключ"
              />
              <p className="muted tiny-hint">Если измените ключ, обновите ссылки на опросник в меню и материалах.</p>
              <label>Название</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                minLength={1}
              />
              <label>Описание (вступление)</label>
              <textarea
                className="input"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                minLength={1}
              />
              <label>
                Порядок сортировки <span className="muted">(меньше — выше в списке)</span>
              </label>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              />
              <label className="inline-check">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Активен (показывается пользователям)
              </label>
            </fieldset>

            <fieldset className="quiz-fieldset">
              <legend>Подписи вариантов ответа (каждый с новой строки)</legend>
              <textarea
                className="input monospace-tiny"
                rows={Math.max(4, form.optionLabelsLines.split("\n").length)}
                value={form.optionLabelsLines}
                onChange={(e) => setForm((f) => ({ ...f, optionLabelsLines: e.target.value }))}
              />
            </fieldset>

            <fieldset className="quiz-fieldset">
              <legend>Интерпретация суммы баллов (диапазоны)</legend>
              <p className="muted tiny-hint">
                Совпадающие диапазоны нежелательны. Границы включительные: от min до max.
              </p>
              <div className="admin-score-bands">
                {form.scoreBands.map((b, i) => (
                  <div className="admin-score-band-row row" key={i}>
                    <label className="mini-field">
                      min
                      <input
                        type="number"
                        className="input"
                        value={b.min}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.scoreBands];
                            next[i] = { ...next[i], min: Number(e.target.value) || 0 };
                            return { ...f, scoreBands: next };
                          })
                        }
                      />
                    </label>
                    <label className="mini-field">
                      max
                      <input
                        type="number"
                        className="input"
                        value={b.max}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.scoreBands];
                            next[i] = { ...next[i], max: Number(e.target.value) || 0 };
                            return { ...f, scoreBands: next };
                          })
                        }
                      />
                    </label>
                    <label className="flex-grow">
                      Краткая метка
                      <input
                        className="input"
                        value={b.label}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.scoreBands];
                            next[i] = { ...next[i], label: e.target.value };
                            return { ...f, scoreBands: next };
                          })
                        }
                      />
                    </label>
                    <label className="flex-grow-full">
                      Текст для пользователя при попадании в диапазон
                      <textarea
                        className="input"
                        rows={2}
                        value={b.text}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.scoreBands];
                            next[i] = { ...next[i], text: e.target.value };
                            return { ...f, scoreBands: next };
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn--ghost btn--icon-only-remove"
                      aria-label="Удалить диапазон"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          scoreBands: f.scoreBands.filter((_, idx) => idx !== i),
                        }))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                onClick={() => setForm((f) => ({ ...f, scoreBands: [...f.scoreBands, { min: 0, max: 1, label: "", text: "" }] }))}
              >
                + Диапазон
              </button>
            </fieldset>

            <fieldset className="quiz-fieldset">
              <legend>Вопросы по порядку</legend>
              {form.questions.map((q, i) => (
                <div className="admin-question-card" key={i}>
                  <div className="admin-question-card__toolbar">
                    <span className="muted">#{i + 1}</span>
                    <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--compact"
                        disabled={i === 0}
                        onClick={() =>
                          setForm((f) => {
                            const qnext = [...f.questions];
                            [qnext[i - 1], qnext[i]] = [qnext[i], qnext[i - 1]];
                            return { ...f, questions: qnext };
                          })
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--compact"
                        disabled={i >= form.questions.length - 1}
                        onClick={() =>
                          setForm((f) => {
                            const qnext = [...f.questions];
                            [qnext[i], qnext[i + 1]] = [qnext[i + 1], qnext[i]];
                            return { ...f, questions: qnext };
                          })
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--compact"
                        onClick={() => setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }))}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  <label>Формулировка вопроса</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={q.text}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = [...f.questions];
                        next[i] = { ...next[i], text: e.target.value };
                        return { ...f, questions: next };
                      })
                    }
                    required={i === 0}
                  />
                  <div className="row wrap-gap">
                    <label className="mini-field">
                      Мин.
                      <input
                        type="number"
                        className="input"
                        value={q.min}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.questions];
                            const min = Number(e.target.value) || 0;
                            next[i] = { ...next[i], min };
                            return { ...f, questions: next };
                          })
                        }
                      />
                    </label>
                    <label className="mini-field">
                      Макс.
                      <input
                        type="number"
                        className="input"
                        value={q.max}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.questions];
                            next[i] = { ...next[i], max: Number(e.target.value) || 1 };
                            return { ...f, questions: next };
                          })
                        }
                      />
                    </label>
                    <label className="inline-check" style={{ marginTop: "1.65rem" }}>
                      <input
                        type="checkbox"
                        checked={q.reverseScore}
                        onChange={(e) =>
                          setForm((f) => {
                            const next = [...f.questions];
                            next[i] = { ...next[i], reverseScore: e.target.checked };
                            return { ...f, questions: next };
                          })
                        }
                      />
                      Инверсия балла
                    </label>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn--ghost" onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, { text: "", min: 0, max: 3, reverseScore: false }] }))}>
                + Вопрос
              </button>
            </fieldset>

            <div className="admin-form-actions row">
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {editorTarget === "new" ? "Создать" : "Сохранить изменения"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => closeEditor()} disabled={busy}>
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <h2 className="section-title">Каталог ({sortedList.length})</h2>
        {sortedList.length === 0 ? <p className="muted">Пока нет опросников в базе.</p> : null}
        <ul className="admin-entity-list">
          {sortedList.map((s) => (
            <li key={s.id} className={`admin-entity-row${!s.isActive ? " admin-entity-row--inactive" : ""}`}>
              <div className="admin-entity-row__main">
                <strong>{s.title}</strong>
                <div className="muted small">
                  Ключ <code>{s.key}</code> · вопросов: {s.questions.length} · сортировка {s.sortOrder} · версия{" "}
                  <code>v{s.version}</code>
                </div>
              </div>
              <div className="admin-entity-row__actions row wrap-gap">
                <span className={`admin-badge ${s.isActive ? "admin-badge--ok" : ""}`}>{s.isActive ? "Активен" : "Скрыт"}</span>
                <Link className="btn btn--ghost btn--compact" target="_blank" rel="noreferrer" to={`/surveys/${encodeURIComponent(s.key)}`}>
                  Просмотр
                </Link>
                <button type="button" className="btn btn--ghost btn--compact" onClick={() => openEdit(s)}>
                  Редактировать
                </button>
                <button type="button" className="btn btn--ghost btn--compact" onClick={() => void hideSurvey(s)}>
                  {s.isActive ? "Скрыть с сайта" : "Вернуть"}
                </button>
                <button type="button" className="btn btn--danger btn--compact" onClick={() => void removeSurveySoft(s)}>
                  В архив
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
