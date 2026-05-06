import { Link, useParams } from "react-router-dom";
import { getHelpTopic } from "../selfhelp/topics.js";

export function SelfHelpTopicPage() {
  const { slug = "" } = useParams();
  const topic = getHelpTopic(slug);

  if (!topic) {
    return (
      <div className="card">
        <h1>Раздел не найден</h1>
        <p className="muted">Проверьте ссылку или вернитесь к списку.</p>
        <Link to="/help" className="btn btn--secondary" style={{ marginTop: "0.75rem", display: "inline-flex" }}>
          Все материалы
        </Link>
      </div>
    );
  }

  return (
    <article className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{ margin: 0 }}>{topic.title}</h1>
        <Link to="/help" className="text-link">
          К списку
        </Link>
      </div>
      <p className="muted">{topic.summary}</p>

      <div className="callout callout--warn" style={{ marginBottom: "1rem" }}>
        {topic.disclaimer}
      </div>

      {topic.sections.map((s) => (
        <section key={s.heading} style={{ marginBottom: "1.1rem" }}>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="muted" style={{ margin: "0.35rem 0" }}>
              {p}
            </p>
          ))}
          {s.bullets ? (
            <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem" }}>
              {s.bullets.map((b) => (
                <li key={b} className="muted" style={{ margin: "0.25rem 0" }}>
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {topic.slug === "blagodarnost" ? (
        <p>
          <Link to="/journal" className="btn btn--primary">
            Открыть дневник
          </Link>
        </p>
      ) : null}
    </article>
  );
}
