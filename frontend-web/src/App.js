import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ImageManagement from "./pages/ImageManagement";
import ApiService from "./services/api";
import "./styles/colors.css";

function ProtectedRoute({ children }) {
  const user = ApiService.getCurrentUser();
  if (!user) {
    return <Navigate to="/" replace />;
  }
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
              <ImageManagement />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
