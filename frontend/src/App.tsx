import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.js";
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function navClass(active: boolean): string {
  return active ? "nav-link nav-link--active" : "nav-link";
}

function AppHeader() {
  const loc = useLocation();
  const campusActive = loc.pathname === "/campus" || loc.pathname.startsWith("/campus/");
  const helpActive = loc.pathname === "/help" || loc.pathname.startsWith("/help/");

  return (
    <header className="top-nav">
      <Link to="/" className="brand">
        Студенческая поддержка
      </Link>
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
      </nav>
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
      </div>
    </AuthProvider>
  );
}
