import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { AdminApiService } from "../api/AdminApiService.js";

const adminApi = new AdminApiService(new ApiClient(""));

export function AdminSelfHelpPage() {
  const [topics, setTopics] = useState<unknown[]>([]);
  const [slug, setSlug] = useState("new-technique");
  const [title, setTitle] = useState("Новая техника");
  const [summary, setSummary] = useState("Краткое описание техники");
  const [body, setBody] = useState("Первый шаг техники.\nВторой шаг техники.");
  const [err, setErr] = useState<string | null>(null);

  const load = () => adminApi.selfHelpTopics().then((r) => setTopics(r.topics));
  useEffect(() => {
    void load().catch(() => setErr("Не удалось загрузить техники"));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await adminApi.createSelfHelpTopic({
        slug,
        title,
        summary,
        disclaimer: "Материал не заменяет помощь специалиста.",
        categories: ["stress"],
        sections: [{ heading: "Как выполнить", paragraphs: body.split("\n").filter(Boolean) }],
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка сохранения");
    }
  }

  return (
    <div className="card">
      <header className="page-header">
        <h1>Админ: самопомощь</h1>
        <Link to="/admin" className="text-link">Назад</Link>
      </header>
      {err ? <p className="error">{err}</p> : null}
      <form onSubmit={(e) => void submit(e)}>
        <label>Slug</label>
        <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <label>Название</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Краткое описание</label>
        <textarea className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <label>Абзацы</label>
        <textarea className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn btn--primary" type="submit">Создать технику</button>
      </form>
      <h2 className="section-title">Техники ({topics.length})</h2>
      <pre className="callout callout--info" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(topics, null, 2)}</pre>
    </div>
  );
}
