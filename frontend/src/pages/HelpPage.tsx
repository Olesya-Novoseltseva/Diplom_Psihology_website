import { Link } from "react-router-dom";

export function HelpPage() {
  return (
    <div className="card">
      <span className="badge" style={{ marginBottom: "0.35rem" }}>
        Самопомощь
      </span>
      <h1>Материалы самопомощи</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Этот раздел мы сейчас заполним: дыхательные практики, техники заземления, короткие инструкции “что делать если…”.
      </p>

      <div className="callout callout--soft" style={{ marginTop: "0.75rem" }}>
        <strong>Скорая помощь (черновик)</strong>
        <div className="muted" style={{ marginTop: 6 }}>
          Если становится тяжело прямо сейчас:
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
            <li>Сделайте 5 медленных вдохов/выдохов (примерно 4–6 секунд на выдох).</li>
            <li>Назовите 5 предметов вокруг, 4 звука, 3 ощущения тела — чтобы “вернуться” в момент.</li>
            <li>Напишите одну короткую фразу в дневник: “Что я чувствую и что мне нужно сейчас”.</li>
          </ul>
        </div>
      </div>

      <p style={{ marginTop: "1rem" }}>
        <Link to="/" className="text-link">
          ← На главную
        </Link>
      </p>
    </div>
  );
}

