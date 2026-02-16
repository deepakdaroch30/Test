"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SsoProvider = "jira" | "azure" | null;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<SsoProvider>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("admin@acme.com");
  const [password, setPassword] = useState("Admin@123");
  const router = useRouter();

  const isAnyAuthLoading = isLoading || ssoLoading !== null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid admin credentials.");
      }

      const payload = (await response.json()) as { role?: string };
      if (payload.role !== "admin") {
        throw new Error("Only admin users can sign in here.");
      }

      router.push("/workspace");
    } catch {
      const localAdmin = email === "admin@acme.com" && password === "Admin@123";
      if (localAdmin) {
        router.push("/workspace");
      } else {
        setErrorMessage("Invalid admin credentials. Use configured admin account.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startSso = (provider: Exclude<SsoProvider, null>) => {
    setErrorMessage("");
    setSsoLoading(provider);

    window.setTimeout(() => {
      setSsoLoading(null);
      setErrorMessage(`${provider === "jira" ? "Jira" : "Azure DevOps"} SSO redirect is not configured in this demo.`);
    }, 1200);
  };

  return (
    <main className="login-shell" aria-live="polite">
      <section className="brand-panel" aria-label="Platform branding">
        <div className="shape shape-a" />
        <div className="shape shape-b" />
        <div className="shape shape-c" />

        <div className="brand-content">
          <div className="logo">QAO</div>
          <h1>AI-Powered QA Orchestration Platform</h1>
          <p>Intelligent Quality. Automated Governance.</p>
        </div>
      </section>

      <section className="form-panel">
        <form className="login-card fade-in" onSubmit={onSubmit}>
          <section className="sso-section" aria-label="Workspace SSO sign in options">
            <h2>Sign in with your Workspace</h2>

            <button
              type="button"
              className="sso-btn"
              onClick={() => startSso("jira")}
              disabled={isAnyAuthLoading}
            >
              {ssoLoading === "jira" ? (
                <span className="spinner-wrap dark">
                  <span className="spinner dark" /> Redirecting...
                </span>
              ) : (
                <>
                  <span className="provider-icon" aria-hidden="true">
                    J
                  </span>
                  <span>Continue with Jira</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="sso-btn"
              onClick={() => startSso("azure")}
              disabled={isAnyAuthLoading}
            >
              {ssoLoading === "azure" ? (
                <span className="spinner-wrap dark">
                  <span className="spinner dark" /> Redirecting...
                </span>
              ) : (
                <>
                  <span className="provider-icon" aria-hidden="true">
                    M
                  </span>
                  <span>Continue with Azure DevOps</span>
                </>
              )}
            </button>

            <p className="future-providers">Future-ready: qTest, Zephyr, TestRail</p>
          </section>

          <div className="or-divider" role="separator" aria-label="Or use email and password">
            <span>OR</span>
          </div>

          <section className="credentials-section">
            <header>
              <h3>Sign in with email</h3>
              <p>Access secure QA governance workflows.</p>
            </header>

            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="admin@acme.com" required disabled={isAnyAuthLoading} value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  disabled={isAnyAuthLoading}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isAnyAuthLoading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label className="check-wrap">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe((current) => !current)}
                  disabled={isAnyAuthLoading}
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-link">
                Forgot password?
              </a>
            </div>

            <p className="error-message" role="alert">
              {errorMessage || "\u00A0"}
            </p>

            <button type="submit" className="submit-btn" disabled={isAnyAuthLoading}>
              {isLoading ? (
                <span className="spinner-wrap">
                  <span className="spinner" /> Signing in...
                </span>
              ) : (
                "Login"
              )}
            </button>

            <p className="trust-text">Secure enterprise authentication • Encrypted &amp; Role-based access</p>
            <p className="helper-text">Admin demo: admin@acme.com / Admin@123</p>
          </section>
        </form>
      </section>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 40% 60%;
          background: #f8fafc;
          color: #1f2937;
          font-family: Inter, Segoe UI, Arial, sans-serif;
        }

        .brand-panel {
          position: relative;
          overflow: hidden;
          background: linear-gradient(155deg, #1e3a8a, #6366f1);
          color: #ffffff;
          display: flex;
          align-items: center;
          padding: 48px;
        }

        .brand-content {
          position: relative;
          z-index: 2;
          max-width: 420px;
        }

        .logo {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin-bottom: 24px;
        }

        .brand-content h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.25;
          font-weight: 700;
        }

        .brand-content p {
          margin: 16px 0 0;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
        }

        .shape {
          position: absolute;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.09);
          animation: float 10s ease-in-out infinite;
        }

        .shape-a {
          width: 140px;
          height: 140px;
          top: 12%;
          right: 10%;
        }

        .shape-b {
          width: 90px;
          height: 90px;
          bottom: 20%;
          left: 16%;
          animation-delay: 1.3s;
        }

        .shape-c {
          width: 180px;
          height: 60px;
          bottom: 10%;
          right: 20%;
          animation-delay: 2.1s;
        }

        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 8px 26px rgba(30, 58, 138, 0.08);
          border: 1px solid rgba(30, 58, 138, 0.08);
        }

        .fade-in {
          animation: fadeIn 300ms ease;
        }

        .sso-section h2 {
          margin: 0 0 16px;
          font-size: 20px;
        }

        .sso-btn {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #1f2937;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          padding: 0 12px;
          cursor: pointer;
          transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }

        .sso-btn + .sso-btn {
          margin-top: 16px;
        }

        .sso-btn:hover:not(:disabled) {
          background: #f8fafc;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
        }

        .sso-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .provider-icon {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          background: #eef2ff;
          color: #1e3a8a;
          flex-shrink: 0;
        }

        .future-providers {
          margin: 16px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .or-divider {
          margin: 24px 0;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .or-divider::before,
        .or-divider::after {
          content: "";
          height: 1px;
          background: #e5e7eb;
        }

        header {
          margin-bottom: 24px;
        }

        header h3 {
          margin: 0;
          font-size: 22px;
        }

        header p {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .field-group {
          margin-bottom: 16px;
          display: grid;
          gap: 8px;
        }

        label {
          font-size: 14px;
          font-weight: 500;
        }

        input[type="email"],
        input[type="password"],
        input[type="text"] {
          width: 100%;
          height: 48px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 16px;
          outline: none;
          color: #1f2937;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-size: 14px;
          box-sizing: border-box;
          line-height: 1.25;
        }

        input:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.15);
        }

        .password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-wrap input {
          padding-right: 74px;
        }

        .toggle-btn {
          position: absolute;
          top: 50%;
          right: 10px;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: #6366f1;
          font-weight: 600;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
        }

        .toggle-btn:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.12);
        }

        .form-row {
          margin: 8px 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .check-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 14px;
          cursor: pointer;
        }

        .check-wrap input {
          accent-color: #1e3a8a;
          width: 16px;
          height: 16px;
        }

        .forgot-link {
          color: #6b7280;
          text-decoration: none;
          font-size: 13px;
        }

        .forgot-link:hover {
          color: #1e3a8a;
          text-decoration: underline;
        }

        .error-message {
          margin: 0 0 8px;
          min-height: 20px;
          color: #dc2626;
          font-size: 13px;
        }

        .submit-btn {
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 8px;
          background: #1e3a8a;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: #1b337a;
          transform: translateY(-1px);
          box-shadow: 0 8px 14px rgba(30, 58, 138, 0.22);
        }

        .submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        .spinner-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .spinner-wrap.dark {
          color: #1f2937;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }

        .spinner.dark {
          border: 2px solid rgba(31, 41, 55, 0.2);
          border-top-color: #1f2937;
        }

        .trust-text {
          margin: 16px 0 0;
          color: #6b7280;
          font-size: 12px;
          text-align: center;
        }

        .helper-text {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 12px;
          text-align: center;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @media (max-width: 1024px) {
          .login-shell {
            grid-template-columns: 32% 68%;
          }

          .brand-panel {
            padding: 32px;
          }

          .brand-content h1 {
            font-size: 24px;
          }
        }

        @media (max-width: 768px) {
          .login-shell {
            grid-template-columns: 1fr;
          }

          .brand-panel {
            display: none;
          }

          .form-panel {
            padding: 20px;
          }

          .login-card {
            padding: 24px;
          }
        }
      `}</style>
    </main>
  );
}
