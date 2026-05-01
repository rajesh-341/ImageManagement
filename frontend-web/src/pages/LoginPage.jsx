import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../services/api";
import "./LoginPage.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      {/* Left Illustration Section */}
      <div className="illustration-panel">
        <div className="curved-bg"></div>

        {/* Brand Logo */}
        <div className="brand">
          <div className="brand-logo">
            <div className="brand-icon">PV</div>
            <div className="brand-text">
              <h2>PV</h2>
              <span>Event Management</span>
            </div>
          </div>
        </div>

        {/* Illustration Scene */}
        <div className="illustration-content">
          <div className="illustration-scene">
            {/* Decorative Stars */}
            <div className="decorations">
              <span className="star">✦</span>
              <span className="star">✦</span>
              <span className="star">✦</span>
              <span className="star">✦</span>
            </div>

            {/* People */}
            <div className="people">
              <div className="person">
                <div className="person-head"></div>
                <div className="person-body"></div>
              </div>
              <div className="person">
                <div className="person-head"></div>
                <div className="person-body"></div>
              </div>
              <div className="person">
                <div className="person-head"></div>
                <div className="person-body"></div>
              </div>
              <div className="person">
                <div className="person-head"></div>
                <div className="person-body"></div>
              </div>
            </div>

            {/* Table */}
            <div className="table-shape"></div>
            <div className="table-legs">
              <div className="table-leg"></div>
              <div className="table-leg"></div>
            </div>

            {/* Cake */}
            <div className="cake">
              <div className="cake-base">
                <div className="cake-layer"></div>
              </div>
            </div>

            {/* Gift Boxes */}
            <div className="gifts">
              <div className="gift"></div>
              <div className="gift"></div>
              <div className="gift"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Divider */}
      <div className="center-divider">
        <div className="divider-dot"></div>
        <div className="divider-dot active"></div>
        <div className="divider-dot"></div>
      </div>

      {/* Right Login Form Section */}
      <div className="form-panel">
        <div className="login-form-container">
          <div className="login-header">
            <h1>Login</h1>
            <p className="subtitle">
              Don&apos;t have an account?{" "}
              <a href="/register">Create your account</a>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-fields">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="options-row">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>
              <a href="/forgot-password" className="forgot-password">
                Forgot Password?
              </a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Social Login */}
          <div className="social-login">
            <p className="divider-text">Or Login with</p>
            <div className="social-buttons">
              {/* Instagram */}
              <button className="social-btn" aria-label="Login with Instagram">
                <svg viewBox="0 0 24 24">
                  <defs>
                    <radialGradient id="igGrad" cx="30%" cy="100%">
                      <stop offset="0%" stopColor="#FEDA75" />
                      <stop offset="25%" stopColor="#FA7E1E" />
                      <stop offset="50%" stopColor="#D62976" />
                      <stop offset="75%" stopColor="#962FBF" />
                      <stop offset="100%" stopColor="#4F5BD5" />
                    </radialGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="url(#igGrad)" strokeWidth="2" />
                  <circle cx="12" cy="12" r="5" fill="none" stroke="url(#igGrad)" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1.5" fill="url(#igGrad)" />
                </svg>
              </button>
              {/* Chrome */}
              <button className="social-btn" aria-label="Login with Google">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" fill="#4285F4" />
                  <path d="M22.56 12c0-1.37-.23-2.69-.64-3.92H12v4.24h5.68c-.24 1.29-.97 2.39-2.07 3.13v2.6h3.33c1.95-1.8 3.06-4.45 3.06-7.53z" fill="#4285F4" />
                  <path d="M12 22.56c2.82 0 5.18-.93 6.9-2.52l-3.33-2.6c-.93.62-2.12.99-3.57.99-2.73 0-5.04-1.84-5.87-4.32H2.7v2.7C4.38 19.97 7.92 22.56 12 22.56z" fill="#34A853" />
                  <path d="M6.13 14.11c-.21-.62-.33-1.28-.33-1.97s.12-1.35.33-1.97V7.47H2.7C2.24 8.38 1.96 9.36 1.96 10.4c0 1.04.28 2.02.74 2.93l3.43-2.7z" fill="#FBBC05" />
                  <path d="M12 5.49c1.52 0 2.88.52 3.95 1.56l2.95-2.95C17.12 2.55 14.76 1.44 12 1.44c-4.08 0-7.62 2.59-9.3 5.7l3.43 2.7C7.04 7.33 9.27 5.49 12 5.49z" fill="#EA4335" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
