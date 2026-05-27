import React, { Suspense, useEffect, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import ApiService from "./services/api";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/colors.css";

const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const ImageManagement = React.lazy(() => import("./pages/ImageManagement"));

function PageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0f172a", color: "#fff", fontSize: 16,
    }}>
      Loading...
    </div>
  );
}

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

function ProtectedRoute({ children }) {
  const user = ApiService.getCurrentUser();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function InactivityWrapper({ children }) {
  const navigate = useNavigate();
  const timer = useRef(null);

  const logout = useCallback(() => {
    ApiService.logout().catch(() => {});
    navigate("/", { replace: true });
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(logout, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    const user = ApiService.getCurrentUser();
    if (!user) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer]);

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
              path="/images"
              element={
                <ProtectedRoute>
                  <InactivityWrapper>
                    <ImageManagement />
                  </InactivityWrapper>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
