"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import TopMenu from "../components/top-menu";

type ToolType = "JIRA" | "AZURE_DEVOPS" | "QTEST" | "ZEPHYR" | "TESTRAIL";
type AuthType = "BASIC" | "OAUTH2" | "PAT" | "TOKEN" | "BEARER";
type Status = "connected" | "disconnected" | "token_expired";

type IntegrationStatus = {
  tenant_id: string;
  tool_type: ToolType | null;
  auth_type: AuthType | null;
  integration_status: Status;
  last_successful_sync: string | null;
  last_tested_timestamp: string | null;
  last_error_message: string | null;
  connected: boolean;
  configuration_locked: boolean;
};

type FieldConfig = { key: string; label: string; sensitive?: boolean; optional?: boolean };

const TOOL_AUTH_OPTIONS: Record<ToolType, AuthType[]> = {
  JIRA: ["BASIC", "OAUTH2", "TOKEN"],
  AZURE_DEVOPS: ["PAT", "OAUTH2"],
  QTEST: ["TOKEN", "OAUTH2"],
  ZEPHYR: ["BEARER"],
  TESTRAIL: ["BASIC", "TOKEN"],
};

const AUTH_FIELDS: Record<AuthType, FieldConfig[]> = {
  BASIC: [
    { key: "username", label: "Username / Email" },
    { key: "password", label: "Password / API Token", sensitive: true },
  ],
  OAUTH2: [
    { key: "tenant_id", label: "Tenant ID", optional: true },
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", sensitive: true },
  ],
  PAT: [{ key: "personal_access_token", label: "Personal Access Token", sensitive: true }],
  TOKEN: [{ key: "api_token", label: "API Token", sensitive: true }],
  BEARER: [{ key: "api_token", label: "API Token", sensitive: true }],
};

const TOOL_BASE_URL_LABEL: Record<ToolType, string> = {
  JIRA: "Jira Base URL",
  AZURE_DEVOPS: "Organization URL",
  QTEST: "qTest Base URL",
  ZEPHYR: "Zephyr Base URL",
  TESTRAIL: "TestRail Base URL",
};

const parseApiPayload = async <T,>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const body = await response.text();
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as T;
  }

  const snippet = trimmed.slice(0, 120);
  throw new Error(
    `Unexpected response from server (${response.status}). Verify backend API routing is configured and returning JSON.${snippet ? ` Response snippet: ${snippet}` : ""}`,
  );
};

const initialStatus: IntegrationStatus = {
  tenant_id: "tenant-acme",
  tool_type: null,
  auth_type: null,
  integration_status: "disconnected",
  last_successful_sync: null,
  last_tested_timestamp: null,
  last_error_message: null,
  connected: false,
  configuration_locked: false,
};

export default function IntegrationConfigurationPage() {
  const [tenantId] = useState("tenant-acme");
  const [toolType, setToolType] = useState<ToolType>("JIRA");
  const [authType, setAuthType] = useState<AuthType>("BASIC");
  const [connectionTestPassed, setConnectionTestPassed] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus>(initialStatus);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [proxyHealth, setProxyHealth] = useState<{ state: "checking" | "ok" | "error"; message: string }>({
    state: "checking",
    message: "Checking API proxy...",
  });
  const [form, setForm] = useState({
    base_url: "",
    webhook_secret: "",
    default_project: "",
    reset_confirmed: false,
    credentials: {} as Record<string, string>,
    zephyr_base_url: "https://prod-api.zephyr4jiracloud.com/v2",
    zephyr_api_token: "",
    zephyr_project_key: "",
  });

  const lockedToDifferentTool = status.configuration_locked && status.tool_type && status.tool_type !== toolType;
  const isZephyr = toolType === "ZEPHYR";

  const commonHeaders = useMemo(() => ({ "Content-Type": "application/json" }), []);

  const activeAuthFields = AUTH_FIELDS[authType];

  useEffect(() => {
    const nextAuth = TOOL_AUTH_OPTIONS[toolType][0];
    setAuthType((prev) => (TOOL_AUTH_OPTIONS[toolType].includes(prev) ? prev : nextAuth));
    setForm((current) => ({ ...current, credentials: {} }));
    setConnectionTestPassed(false);
  }, [toolType]);

  const updateCredential = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      credentials: { ...current.credentials, [key]: value },
    }));
  };

  const fetchStatus = async () => {
    setProxyHealth({ state: "checking", message: "Checking API proxy..." });
    try {
      const response = await fetch(`/api/v1/integrations/status?tenant_id=${tenantId}`, { headers: commonHeaders });
      if (!response.ok) {
        setProxyHealth({ state: "error", message: `Proxy check failed (${response.status}).` });
        throw new Error("Unable to load integration status");
      }

      const payload = await parseApiPayload<IntegrationStatus>(response);
      setStatus(payload);
      if (payload.tool_type) setToolType(payload.tool_type);
      if (payload.auth_type) setAuthType(payload.auth_type);
      setProxyHealth({ state: "ok", message: "API proxy reachable." });
    } catch (error) {
      setProxyHealth({
        state: "error",
        message: error instanceof Error ? error.message : "Proxy check failed.",
      });
      throw error;
    }
  };

  useEffect(() => {
    void fetchStatus().catch(() => null);
  }, []);

  const onTestConnection = async (event: FormEvent) => {
    event.preventDefault();
    setIsTesting(true);
    setFeedback(null);

    try {
      if (isZephyr) {
        const payload = {
          tenant_id: tenantId,
          base_url: form.zephyr_base_url,
          api_token: form.zephyr_api_token,
        };

        const response = await fetch("/api/v1/integrations/zephyr/test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await parseApiPayload<{ success?: boolean; error?: string; detail?: string }>(response);

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.detail ||
              "Zephyr test failed via proxy. Verify BACKEND_ORIGIN and backend availability.",
          );
        }

        if (!result.success) {
          throw new Error(result.error || result.detail || "Zephyr connection test failed");
        }

        setConnectionTestPassed(true);
        setFeedback({ tone: "ok", text: "Connection Successful" });
        await fetchStatus();
        return;
      }

      const payload = {
        tenant_id: tenantId,
        tool_type: toolType,
        auth_type: authType,
        base_url: form.base_url,
        credentials: form.credentials,
        webhook_secret: toolType === "JIRA" ? "" : form.webhook_secret,
      };

      const response = await fetch("/api/v1/integrations/test", {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(payload),
      });
      const result = await parseApiPayload<{ status?: string; message?: string; detail?: string }>(response);
      if (!response.ok || result.status === "error") {
        throw new Error(result.detail || result.message || "Connection test failed");
      }

      setConnectionTestPassed(true);
      setFeedback({ tone: "ok", text: "Connection Successful" });
      await fetchStatus();
    } catch (error) {
      setConnectionTestPassed(false);
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Connection test failed" });
    } finally {
      setIsTesting(false);
    }
  };

  const onSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      if (isZephyr) {
        const payload = {
          tenant_id: tenantId,
          base_url: form.zephyr_base_url,
          api_token: form.zephyr_api_token,
          project_key: form.zephyr_project_key,
        };

        const response = await fetch("/api/v1/integrations/zephyr/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await parseApiPayload<{ success?: boolean; message?: string; error?: string; detail?: string }>(response);

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.detail ||
              "Zephyr save failed via proxy. Verify BACKEND_ORIGIN and backend availability.",
          );
        }

        if (!result.success) {
          throw new Error(result.error || result.detail || result.message || "Unable to save Zephyr configuration");
        }

        setFeedback({ tone: "ok", text: "Zephyr configuration saved." });
        setForm((current) => ({ ...current, zephyr_api_token: "" }));
        await fetchStatus();
        return;
      }

      const payload = {
        tenant_id: tenantId,
        tool_type: toolType,
        auth_type: authType,
        base_url: form.base_url,
        credentials: form.credentials,
        webhook_secret: toolType === "JIRA" ? "" : form.webhook_secret,
        default_project: form.default_project || null,
        reset_confirmed: form.reset_confirmed,
      };

      const response = await fetch("/api/v1/integrations/save", {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(payload),
      });
      const result = await parseApiPayload<{ message?: string; detail?: string }>(response);
      if (!response.ok) throw new Error(result.detail || "Unable to save configuration");

      setFeedback({ tone: "ok", text: result.message || "Integration configuration saved securely." });
      setForm((current) => ({ ...current, credentials: {} }));
      await fetchStatus();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Save failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const runAction = async (path: "reconnect" | "force-sync") => {
    setIsRunningAction(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/integrations/${path}?tenant_id=${tenantId}`, {
        method: "POST",
        headers: commonHeaders,
      });
      const result = await parseApiPayload<{ message?: string; detail?: string }>(response);
      if (!response.ok) throw new Error(result.detail || "Action failed");
      setFeedback({ tone: "ok", text: result.message || "Action completed" });
      await fetchStatus();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Action failed" });
    } finally {
      setIsRunningAction(false);
    }
  };

  const statusLabel =
    status.integration_status === "connected"
      ? "Connected"
      : status.integration_status === "token_expired"
        ? "Token Expired"
        : "Not Connected";

  return (
    <main className="config-shell">
      <TopMenu current="integration" />
      <header className="header">
        <div>
          <h1>Integration Configuration</h1>
          <p className="tenant">Tenant: {tenantId}</p>
          <div className="status-row">
            <span className={`pill ${status.integration_status}`}>{statusLabel}</span>
            <span className="pill">Last Sync: {status.last_successful_sync ? new Date(status.last_successful_sync).toLocaleString() : "—"}</span>
          </div>
          <div className={`proxy-health ${proxyHealth.state}`} role="status" aria-live="polite">
            <span className={`dot ${proxyHealth.state}`} aria-hidden="true" />
            <span>Proxy Health: {proxyHealth.message}</span>
          </div>
        </div>
      </header>

      <section className="card">
        <h2>Primary Tool Selection</h2>
        {status.configuration_locked && <p className="warn-text">Changing primary tool will reset all integration mappings.</p>}

        <div className="grid two">
          <label>
            Tool Type
            <select
              value={toolType}
              onChange={(event) => setToolType(event.target.value as ToolType)}
              disabled={Boolean(lockedToDifferentTool && !form.reset_confirmed)}
            >
              <option value="JIRA">Jira</option>
              <option value="ZEPHYR">Zephyr Scale Cloud</option>
              <option value="AZURE_DEVOPS">Azure DevOps</option>
              <option value="QTEST">qTest</option>
              <option value="TESTRAIL">TestRail</option>
            </select>
          </label>

          <label>
            Authentication Type
            <select value={authType} onChange={(event) => setAuthType(event.target.value as AuthType)} disabled={isZephyr}>
              {TOOL_AUTH_OPTIONS[toolType].map((option) => (
                <option key={option} value={option}>
                  {option === "BEARER" ? "BEARER" : option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <form className="card" onSubmit={onTestConnection}>
        <h2>{isZephyr ? "ZEPHYR CONFIGURATION (BEARER)" : `${toolType} Configuration (${authType})`}</h2>

        <div className="grid two">
          {isZephyr ? (
            <>
              <label>
                Zephyr Base URL
                <input
                  required
                  placeholder="https://prod-api.zephyr4jiracloud.com/v2"
                  value={form.zephyr_base_url}
                  onChange={(event) => setForm((current) => ({ ...current, zephyr_base_url: event.target.value }))}
                />
              </label>

              <label>
                API Token
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={form.zephyr_api_token}
                  onChange={(event) => setForm((current) => ({ ...current, zephyr_api_token: event.target.value }))}
                />
              </label>

              <label>
                Default Project Key
                <input
                  required
                  placeholder="e.g., KAN"
                  value={form.zephyr_project_key}
                  onChange={(event) => setForm((current) => ({ ...current, zephyr_project_key: event.target.value }))}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                {TOOL_BASE_URL_LABEL[toolType]}
                <input
                  required
                  placeholder="https://"
                  value={form.base_url}
                  onChange={(event) => setForm((current) => ({ ...current, base_url: event.target.value }))}
                />
              </label>

              {activeAuthFields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    type={field.sensitive ? "password" : "text"}
                    autoComplete="new-password"
                    required={!field.optional}
                    value={form.credentials[field.key] || ""}
                    onChange={(event) => updateCredential(field.key, event.target.value)}
                  />
                </label>
              ))}

              <label>
                Default Project / Workspace (optional)
                <input
                  value={form.default_project}
                  onChange={(event) => setForm((current) => ({ ...current, default_project: event.target.value }))}
                />
              </label>

              {toolType !== "JIRA" && (
                <label>
                  Webhook Secret
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={form.webhook_secret}
                    onChange={(event) => setForm((current) => ({ ...current, webhook_secret: event.target.value }))}
                  />
                </label>
              )}
            </>
          )}
        </div>

        <div className="actions">
          <button className="btn secondary" type="submit" disabled={isTesting}>
            {isTesting ? "Testing..." : "Test Connection"}
          </button>
          <button className="btn" type="button" disabled={!connectionTestPassed || isSaving} onClick={onSave}>
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>

        {feedback && <p className={`feedback ${feedback.tone}`}>{feedback.text}</p>}
      </form>

      <section className="card">
        <h2>Integration Health</h2>
        <div className="grid two health-grid">
          <p>
            Current Status: <strong>{statusLabel}</strong>
          </p>
          <p>
            Auth Type: <strong>{status.auth_type || "—"}</strong>
          </p>
          <p>
            Last Successful Sync: <strong>{status.last_successful_sync ? new Date(status.last_successful_sync).toLocaleString() : "—"}</strong>
          </p>
          <p>
            Last Tested: <strong>{status.last_tested_timestamp ? new Date(status.last_tested_timestamp).toLocaleString() : "—"}</strong>
          </p>
          <p>
            Last Error: <strong>{status.last_error_message || "—"}</strong>
          </p>
        </div>
        <div className="actions">
          <button className="btn secondary" onClick={() => runAction("reconnect")} disabled={isRunningAction}>
            Reconnect
          </button>
          <button className="btn secondary" onClick={() => runAction("force-sync")} disabled={isRunningAction}>
            Force Sync
          </button>
        </div>
      </section>

      <style jsx>{`
        .config-shell { min-height: 100vh; background: #f8fafc; color: #1f2937; padding: 32px; font-family: Inter, Segoe UI, Arial, sans-serif; }
        .header h1 { margin: 0; color: #1e3a8a; font-size: 30px; }
        .tenant { color: #6b7280; margin: 8px 0; }
        .status-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .proxy-health { margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; padding: 6px 10px; border-radius: 999px; border: 1px solid #d1d5db; background: #fff; }
        .proxy-health.ok { color: #166534; border-color: #bbf7d0; }
        .proxy-health.error { color: #991b1b; border-color: #fecaca; }
        .proxy-health.checking { color: #92400e; border-color: #fde68a; }
        .dot { width: 8px; height: 8px; border-radius: 999px; background: currentColor; display: inline-block; }
        .dot.checking { animation: pulse 1.2s ease-in-out infinite; }
        .pill { font-size: 12px; padding: 6px 10px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; }
        .pill.connected { color: #166534; border-color: #bbf7d0; }
        .pill.disconnected { color: #991b1b; border-color: #fecaca; }
        .pill.token_expired { color: #92400e; border-color: #fde68a; }
        .card { margin-top: 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05); }
        .card h2 { margin: 0 0 12px; font-size: 18px; }
        .warn-text { color: #92400e; margin: 0 0 10px; font-size: 14px; }
        .grid { display: grid; gap: 12px; }
        .grid.two { grid-template-columns: 1fr 1fr; }
        label { display: grid; gap: 6px; font-size: 13px; color: #374151; }
        input, select { height: 42px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 12px; outline: none; background: #fff; }
        input:focus, select:focus { border-color: #1e3a8a; box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.12); }
        .actions { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
        .btn { border: 0; border-radius: 8px; height: 40px; padding: 0 14px; font-weight: 600; cursor: pointer; background: #1e3a8a; color: #fff; }
        .btn.secondary { background: #fff; color: #1f2937; border: 1px solid #d1d5db; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .feedback { margin: 12px 0 0; font-size: 14px; }
        .feedback.ok { color: #16a34a; }
        .feedback.error { color: #dc2626; }
        .feedback.warn { color: #92400e; }
        .health-grid p { margin: 0; color: #4b5563; }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @media (max-width: 900px) { .config-shell { padding: 20px; } .grid.two { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
