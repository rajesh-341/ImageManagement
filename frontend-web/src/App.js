import React, { useEffect, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ImageManagement from "./pages/ImageManagement";
import ApiService from "./services/api";
import "./styles/colors.css";

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
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
