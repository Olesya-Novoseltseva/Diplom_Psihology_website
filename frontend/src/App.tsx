import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext.js";
import { HomePage } from "./pages/HomePage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { JournalPage } from "./pages/JournalPage.js";
import { SurveysListPage } from "./pages/SurveysListPage.js";
import { SurveyPage } from "./pages/SurveyPage.js";
import { CampusPage } from "./pages/CampusPage.js";
import { CampusBuildingPage } from "./pages/CampusBuildingPage.js";
import { SelfHelpHub } from "./pages/SelfHelpHub.js";
import { SelfHelpTopicPage } from "./pages/SelfHelpTopicPage.js";
import { AdminDashboardPage } from "./pages/AdminDashboardPage.js";
import { AdminCampusPage } from "./pages/AdminCampusPage.js";
import { AdminSurveysPage } from "./pages/AdminSurveysPage.js";
import { AdminSelfHelpPage } from "./pages/AdminSelfHelpPage.js";

function AdminOnly({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="card"><p className="muted">Проверяем доступ…</p></div>;
  if (!user || user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/journal" element={<JournalPage />} />
      <Route path="/surveys" element={<SurveysListPage />} />
      <Route path="/surveys/:key" element={<SurveyPage />} />
      <Route path="/campus" element={<CampusPage />} />
      <Route path="/campus/:slug" element={<CampusBuildingPage />} />
      <Route path="/help" element={<SelfHelpHub />} />
      <Route path="/help/:slug" element={<SelfHelpTopicPage />} />
      <Route path="/admin" element={<AdminOnly><AdminDashboardPage /></AdminOnly>} />
      <Route path="/admin/campus" element={<AdminOnly><AdminCampusPage /></AdminOnly>} />
      <Route path="/admin/surveys" element={<AdminOnly><AdminSurveysPage /></AdminOnly>} />
      <Route path="/admin/selfhelp" element={<AdminOnly><AdminSelfHelpPage /></AdminOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function navClass(active: boolean): string {
  return active ? "nav-link nav-link--active" : "nav-link";
}

function AppHeader() {
  const loc = useLocation();
  const { user, logout } = useAuth();
  const campusActive = loc.pathname === "/campus" || loc.pathname.startsWith("/campus/");
  const helpActive = loc.pathname === "/help" || loc.pathname.startsWith("/help/");
  const adminActive = loc.pathname === "/admin" || loc.pathname.startsWith("/admin/");

  return (
    <header className="top-nav">
      <Link to="/" className="brand">
        Студенческая поддержка
      </Link>
      <div className="top-nav__cluster">
        <nav className="top-nav__links" aria-label="Основные разделы">
          <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
            Главная
          </NavLink>
          <NavLink to="/surveys" className={({ isActive }) => navClass(isActive)}>
            Опросники
          </NavLink>
          <NavLink to="/journal" className={({ isActive }) => navClass(isActive)}>
            Дневник
          </NavLink>
          <NavLink to="/help" className={() => navClass(helpActive)}>
            Самопомощь
          </NavLink>
          <NavLink to="/campus" className={() => navClass(campusActive)}>
            Кампус
          </NavLink>
          {user?.role === "ADMIN" ? (
            <NavLink to="/admin" className={() => navClass(adminActive)}>
              Админ
            </NavLink>
          ) : null}
        </nav>
        {user ? (
          <button type="button" className="nav-link nav-link--logout" onClick={logout}>
            Выйти
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <AppHeader />
        <main>
          <AppRoutes />
        </main>
        <footer className="site-footer" role="contentinfo">
          <p>
            Материалы сервиса не заменяют очную помощь специалиста и не являются медицинским диагнозом. При острой угрозе жизни и здоровья
            звоните <strong>112</strong>.
          </p>
        </footer>
      </div>
    </AuthProvider>
  );
}
