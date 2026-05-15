import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import {
  AdminApiService,
  type AdminSelfHelpInput,
  type AdminSelfHelpSectionDto,
  type AdminSelfHelpTopicDto,
} from "../api/AdminApiService.js";

const adminApi = new AdminApiService(new ApiClient(""));

export type SelfHelpFormModel = {
  slug: string;
  title: string;
  summary: string;
  disclaimer: string;
  categoriesLine: string;
  sections: Array<{ heading: string; paragraphsBlock: string; bulletsBlock: string }>;
  isActive: boolean;
  sortOrder: number;
};

function categoriesToCsv(c: unknown): string {
  if (Array.isArray(c)) return c.map(String).filter(Boolean).join(", ");
  return "";
}

function sectionParagraphs(sec: AdminSelfHelpSectionDto): string {
  const p = sec.paragraphs;
  if (Array.isArray(p)) return p.filter(Boolean).map(String).join("\n\n");
  if (typeof p === "string") return p;
  return "";
}

function sectionBullets(sec: AdminSelfHelpSectionDto): string {
  const b = sec.bullets;
  if (Array.isArray(b)) return b.map(String).filter(Boolean).join("\n");
  return "";
}

function dtoToForm(t: AdminSelfHelpTopicDto): SelfHelpFormModel {
  return {
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    disclaimer: t.disclaimer,
    categoriesLine: categoriesToCsv(t.categories),
    sections: t.sections
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        heading: s.heading,
        paragraphsBlock: sectionParagraphs(s),
        bulletsBlock: sectionBullets(s),
      })),
    isActive: t.isActive,
    sortOrder: t.sortOrder,
  };
}

function formToPayload(f: SelfHelpFormModel): AdminSelfHelpInput {
  const categories = f.categoriesLine
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const sections = f.sections.map((sec) => {
    const paragraphs = sec.paragraphsBlock
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    const bulletsRaw = sec.bulletsBlock
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const out: { heading: string; paragraphs: string[]; bullets?: string[] } = {
      heading: sec.heading.trim(),
      paragraphs: paragraphs.length ? paragraphs : [""],
    };
    if (bulletsRaw.length) out.bullets = bulletsRaw;

    return out;
  });

  return {
    slug: f.slug.trim(),
    title: f.title.trim(),
    summary: f.summary.trim(),
    disclaimer: f.disclaimer.trim(),
    categories,
    sections,
    isActive: f.isActive,
    sortOrder: f.sortOrder,
  };
}

function emptyTopicForm(): SelfHelpFormModel {
  return {
    slug: "",
    title: "",
    summary: "",
    disclaimer: "Этот материал не заменяет консультацию специалиста. При остром состоянии обратитесь за очной помощью.",
    categoriesLine: "",
    sections: [{ heading: "Шаги", paragraphsBlock: "", bulletsBlock: "" }],
    isActive: true,
    sortOrder: 0,
  };
}

export function AdminSelfHelpPage() {
  const [topics, setTopics] = useState<AdminSelfHelpTopicDto[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorTarget, setEditorTarget] = useState<"new" | string | null>(null);
  const [form, setForm] = useState<SelfHelpFormModel>(() => emptyTopicForm());

  const load = useCallback(async () => {
    const r = await adminApi.selfHelpTopics();
    setTopics(r.topics);
  }, []);

  useEffect(() => {
    void load().catch(() => setErr("Не удалось загрузить темы самопомощи"));
  }, [load]);

  useEffect(() => {
    if (editorTarget === "new") {
      setForm(emptyTopicForm());
      return;
    }
    if (editorTarget) {
      const b = topics.find((x) => x.id === editorTarget);
      if (b) setForm(dtoToForm(b));
    }
  }, [editorTarget, topics]);

  function openCreate() {
    setErr(null);
    setEditorTarget("new");
    setForm(emptyTopicForm());
  }

  function openEdit(x: AdminSelfHelpTopicDto) {
    setErr(null);
    setEditorTarget(x.id);
    setForm(dtoToForm(x));
  }

  function closeEditor() {
    setEditorTarget(null);
    setErr(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const badSection = form.sections.findIndex((sec) => !sec.heading.trim());
    if (badSection !== -1) {
      setErr(`Укажите заголовок у раздела #${badSection + 1}.`);
      return;
    }
    if (!form.sections.length) {
      setErr("Добавьте хотя бы один раздел.");
      return;
    }
    const payload = formToPayload(form);

    let ok = true;
    for (const sec of payload.sections) {
      if (sec.paragraphs.every((p) => !p.trim())) {
        setErr("В каждом разделе нужен хотя бы один абзац (параграф).");
        ok = false;
        break;
      }
    }
    if (!ok) return;

    setBusy(true);
    try {
      if (editorTarget === "new") await adminApi.createSelfHelpTopic(payload);
      else if (editorTarget) await adminApi.updateSelfHelpTopic(editorTarget, payload);
      await load();
      closeEditor();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(x: AdminSelfHelpTopicDto) {
    const act = x.isActive ? "скрыть" : "показать";
    if (!window.confirm(`${act.charAt(0).toUpperCase() + act.slice(1)} материал «${x.title}»?`)) return;
    setErr(null);
    try {
      await adminApi.updateSelfHelpTopic(x.id, { isActive: !x.isActive });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка");
    }
  }

  async function archive(x: AdminSelfHelpTopicDto) {
    if (!window.confirm(`Скрыть тему «${x.title}» из каталога для пользователей?`)) return;
    setErr(null);
    try {
      await adminApi.deleteSelfHelpTopic(x.id);
      await load();
      if (editorTarget === x.id) closeEditor();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка");
    }
  }

  const sorted = useMemo(
    () => [...topics].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru")),
    [topics],
  );

  return (
    <div className="card">
      <header className="page-header">
        <h1>Самопомощь</h1>
        <Link to="/admin" className="text-link">
          Назад
        </Link>
      </header>
      <p className="muted" style={{ marginTop: 0 }}>
        Техники самопомощи: разделы с заголовком, текстом и необязательным списком. Добавление — отдельной кнопкой.
      </p>
      {err ? <p className="error">{err}</p> : null}

      <div className="admin-toolbar">
        <button type="button" className="btn btn--primary" disabled={busy} onClick={() => openCreate()}>
          + Новая техника
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void load()}>
          Обновить список
        </button>
      </div>

      {editorTarget ? (
        <section className="admin-editor-panel">
          <div className="admin-editor-panel__head">
            <h2 className="admin-editor-panel__title">{editorTarget === "new" ? "Новая тема" : "Редактирование"}</h2>
            <button type="button" className="btn btn--ghost" onClick={() => closeEditor()} disabled={busy}>
              Закрыть
            </button>
          </div>
          <form className="admin-editor-form" onSubmit={(e) => void submit(e)}>
            <fieldset className="quiz-fieldset">
              <legend>Основное</legend>
              <label>
                Slug URL <span className="muted">(латиница, -)</span>
              </label>
              <input
                className="input monospace-tiny"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                pattern="^[a-z0-9_-]{2,}$"
                placeholder="grounding-steps"
                required
              />
              <label>Название</label>
              <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              <label>Краткое описание (список карточек)</label>
              <textarea className="input" rows={3} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} required />
              <label>Юридическое ограничение / дисклеймер</label>
              <textarea className="input" rows={3} value={form.disclaimer} onChange={(e) => setForm((f) => ({ ...f, disclaimer: e.target.value }))} required />
              <label>
                Теги <span className="muted">(через запятую или пробел)</span>
              </label>
              <input
                className="input monospace-tiny"
                value={form.categoriesLine}
                onChange={(e) => setForm((f) => ({ ...f, categoriesLine: e.target.value }))}
                placeholder="stress anxiety"
              />
              <label>Сортировка</label>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              />
              <label className="inline-check">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Активна
              </label>
            </fieldset>

            <fieldset className="quiz-fieldset">
              <legend>Разделы</legend>
              <p className="muted tiny-hint">Абзацы отделяйте пустой строкой; в «Список» — одна строка = один маркированный пункт.</p>
              {form.sections.map((sec, i) => (
                <div key={i} className="admin-question-card admin-help-section">
                  <div className="admin-question-card__toolbar">
                    <span className="muted">Раздел {i + 1}</span>
                    <div className="row wrap-gap">
                      <button
                        type="button"
                        className="btn btn--ghost btn--compact"
                        disabled={i === 0}
                        onClick={() =>
                          setForm((f) => {
                            const next = [...f.sections];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            return { ...f, sections: next };
                          })
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--compact"
                        disabled={i >= form.sections.length - 1}
                        onClick={() =>
                          setForm((f) => {
                            const next = [...f.sections];
                            [next[i], next[i + 1]] = [next[i + 1], next[i]];
                            return { ...f, sections: next };
                          })
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--compact"
                        onClick={() => setForm((f) => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }))}
                      >
                        Удалить раздел
                      </button>
                    </div>
                  </div>
                  <label>Заголовок раздела</label>
                  <input
                    className="input"
                    value={sec.heading}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = [...f.sections];
                        next[i] = { ...next[i], heading: e.target.value };
                        return { ...f, sections: next };
                      })
                    }
                    required
                  />
                  <label>Абзацы</label>
                  <textarea
                    className="input"
                    rows={5}
                    value={sec.paragraphsBlock}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = [...f.sections];
                        next[i] = { ...next[i], paragraphsBlock: e.target.value };
                        return { ...f, sections: next };
                      })
                    }
                    placeholder={`Первый блок текста...\n\nВторой абзац...`}
                  />
                  <label>Список (по строке)</label>
                  <textarea
                    className="input monospace-tiny"
                    rows={3}
                    value={sec.bulletsBlock}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = [...f.sections];
                        next[i] = { ...next[i], bulletsBlock: e.target.value };
                        return { ...f, sections: next };
                      })
                    }
                    placeholder={"Шаг один\nШаг два"}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    sections: [...f.sections, { heading: "Новый раздел", paragraphsBlock: "", bulletsBlock: "" }],
                  }))
                }
              >
                + Раздел
              </button>
            </fieldset>

            <div className="admin-form-actions row">
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {editorTarget === "new" ? "Создать" : "Сохранить"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => closeEditor()} disabled={busy}>
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <h2 className="section-title">Материалы ({sorted.length})</h2>
        {!sorted.length ? <p className="muted">Пока нет записей самопомощи.</p> : null}
        <ul className="admin-entity-list">
          {sorted.map((t) => (
            <li key={t.id} className={`admin-entity-row${!t.isActive ? " admin-entity-row--inactive" : ""}`}>
              <div className="admin-entity-row__main">
                <strong>{t.title}</strong>
                <div className="muted small">
                  /<code>{t.slug}</code> · разделов: {t.sections.length} · порядок {t.sortOrder}
                </div>
              </div>
              <div className="admin-entity-row__actions row wrap-gap">
                <span className={`admin-badge ${t.isActive ? "admin-badge--ok" : ""}`}>{t.isActive ? "Активна" : "Скрыта"}</span>
                <Link className="btn btn--ghost btn--compact" target="_blank" rel="noreferrer" to={`/help/${encodeURIComponent(t.slug)}`}>
                  Просмотр
                </Link>
                <button type="button" className="btn btn--ghost btn--compact" onClick={() => openEdit(t)}>
                  Редактировать
                </button>
                <button type="button" className="btn btn--ghost btn--compact" onClick={() => void toggleActive(t)}>
                  {t.isActive ? "Скрыть с сайта" : "Вернуть"}
                </button>
                <button type="button" className="btn btn--danger btn--compact" onClick={() => void archive(t)}>
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
