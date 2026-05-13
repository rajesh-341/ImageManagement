import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import "./LoginPage.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await ApiService.login(username, password);

      if (response.success) {
        navigate("/images", { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="illustration-panel">
        <div className="curved-bg"></div>
        <div className="brand">
          <div className="brand-logo">
            <div className="brand-icon">PV</div>
            <div className="brand-text">
              <h2>PV</h2>
              <span>Event Management</span>
            </div>
          </div>
        </div>
        <div className="illustration-content">
          <div className="illustration-scene">
            <div className="decorations">
              <span className="star">✦</span>
              <span className="star">✦</span>
              <span className="star">✦</span>
              <span className="star">✦</span>
            </div>
            <div className="people">
              <div className="person"><div className="person-head"></div><div className="person-body"></div></div>
              <div className="person"><div className="person-head"></div><div className="person-body"></div></div>
              <div className="person"><div className="person-head"></div><div className="person-body"></div></div>
              <div className="person"><div className="person-head"></div><div className="person-body"></div></div>
            </div>
            <div className="table-shape"></div>
            <div className="table-legs">
              <div className="table-leg"></div>
              <div className="table-leg"></div>
            </div>
            <div className="cake">
              <div className="cake-base"><div className="cake-layer"></div></div>
            </div>
            <div className="gifts">
              <div className="gift"></div>
              <div className="gift"></div>
              <div className="gift"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="center-divider">
        <div className="divider-dot"></div>
        <div className="divider-dot active"></div>
        <div className="divider-dot"></div>
      </div>

      <div className="form-panel">
        <div className="login-form-container">
          <div className="login-header">
            <h1>Login</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-fields">
              <div className="input-group">
                <input type="text" placeholder="Username" value={username}
                  onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="input-group password-group">
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="options-row">
              <label className="remember-me">
                <input type="checkbox" checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)} />
                Remember Me
              </label>
              <a href="/forgot-password" className="forgot-password">Forgot Password?</a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
