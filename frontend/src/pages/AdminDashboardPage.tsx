import { Link } from "react-router-dom";

export function AdminDashboardPage() {
  return (
    <div className="card">
      <h1>Админ-панель</h1>
      <p className="muted">Управление MVP-контентом: карта кампуса, опросники и техники самопомощи.</p>
      <div className="stack-gap">
        <Link className="survey-row" to="/admin/campus">Точки кампуса</Link>
        <Link className="survey-row" to="/admin/surveys">Опросники</Link>
        <Link className="survey-row" to="/admin/selfhelp">Техники самопомощи</Link>
      </div>
    </div>
  );
}
