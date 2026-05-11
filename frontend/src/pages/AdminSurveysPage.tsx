import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "../api/ApiClient.js";
import { AdminApiService } from "../api/AdminApiService.js";

const adminApi = new AdminApiService(new ApiClient(""));

export function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<unknown[]>([]);
  const [key, setKey] = useState("custom");
  const [title, setTitle] = useState("Новый опросник");
  const [description, setDescription] = useState("Описание опросника");
  const [questionsText, setQuestionsText] = useState("Первый вопрос?\nВторой вопрос?");
  const [err, setErr] = useState<string | null>(null);

  const load = () => adminApi.surveys().then((r) => setSurveys(r.surveys));
  useEffect(() => {
    void load().catch(() => setErr("Не удалось загрузить опросники"));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await adminApi.createSurvey({
        key,
        title,
        description,
        sharedOptionLabels: ["Совсем нет", "Иногда", "Часто", "Почти всегда"],
        questions: questionsText.split("\n").filter(Boolean).map((text) => ({ text, min: 0, max: 3 })),
        scoreBands: [
          { min: 0, max: 4, label: "низко", text: "Низкий уровень по самоопроснику." },
          { min: 5, max: 9, label: "умеренно", text: "Умеренный уровень, полезно самонаблюдение." },
          { min: 10, max: 99, label: "высоко", text: "Высокий уровень, стоит обратиться за очной поддержкой." },
        ],
      });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Ошибка сохранения");
    }
  }

  return (
    <div className="card">
      <header className="page-header">
        <h1>Админ: опросники</h1>
        <Link to="/admin" className="text-link">Назад</Link>
      </header>
      {err ? <p className="error">{err}</p> : null}
      <form onSubmit={(e) => void submit(e)}>
        <label>Ключ</label>
        <input className="input" value={key} onChange={(e) => setKey(e.target.value)} />
        <label>Название</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Описание</label>
        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label>Вопросы, каждый с новой строки</label>
        <textarea className="input" rows={6} value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} />
        <button className="btn btn--primary" type="submit">Создать опросник</button>
      </form>
      <h2 className="section-title">Опросники ({surveys.length})</h2>
      <pre className="callout callout--info" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(surveys, null, 2)}</pre>
    </div>
  );
}
