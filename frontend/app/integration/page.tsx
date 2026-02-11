"use client";

import { FormEvent, useMemo, useState } from "react";

type ToolType = "JIRA" | "AZURE_DEVOPS";
type Status = "connected" | "disconnected" | "token_expired";

type IntegrationStatus = {
  tenant_id: string;
  tool_type: ToolType | null;
  integration_status: Status;
  last_successful_sync: string | null;
  last_tested_timestamp: string | null;
  last_error_message: string | null;
  connected: boolean;
  configuration_locked: boolean;
};

const initialStatus: IntegrationStatus = {
  tenant_id: "tenant-acme",
  tool_type: null,
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
  const [connectionTestPassed, setConnectionTestPassed] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus>(initialStatus);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [form, setForm] = useState({
    base_url: "",
    client_id: "",
    client_secret: "",
    api_token: "",
    tenant_identifier: "",
    personal_access_token: "",
    webhook_secret: "",
    default_project: "",
    reset_confirmed: false,
  });

  const lockedToDifferentTool = status.configuration_locked && status.tool_type && status.tool_type !== toolType;

  const commonHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-role": "admin",
    }),
    [],
  );

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const fetchStatus = async () => {
    const response = await fetch(`/api/v1/integrations/status?tenant_id=${tenantId}`, { headers: commonHeaders });
    if (!response.ok) throw new Error("Unable to load integration status");
    const payload = (await response.json()) as IntegrationStatus;
    setStatus(payload);
    if (payload.tool_type) setToolType(payload.tool_type);
  };

  const onTestConnection = async (event: FormEvent) => {
    event.preventDefault();
    setIsTesting(true);
    setFeedback(null);
    try {
      const payload = {
        tenant_id: tenantId,
        tool_type: toolType,
        base_url: form.base_url,
        client_id: form.client_id || null,
        client_secret: form.client_secret || null,
        api_token: toolType === "JIRA" ? form.api_token || null : null,
        tenant_identifier: toolType === "AZURE_DEVOPS" ? form.tenant_identifier || null : null,
        personal_access_token: toolType === "AZURE_DEVOPS" ? form.personal_access_token || null : null,
        webhook_secret: form.webhook_secret,
      };

      const response = await fetch("/api/v1/integrations/test", {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { status?: string; message?: string; detail?: string };
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
      const payload = {
        tenant_id: tenantId,
        tool_type: toolType,
        base_url: form.base_url,
        client_id: form.client_id || null,
        client_secret: form.client_secret || null,
        api_token: toolType === "JIRA" ? form.api_token || null : null,
        tenant_identifier: toolType === "AZURE_DEVOPS" ? form.tenant_identifier || null : null,
        personal_access_token: toolType === "AZURE_DEVOPS" ? form.personal_access_token || null : null,
        webhook_secret: form.webhook_secret,
        default_project: form.default_project || null,
        reset_confirmed: form.reset_confirmed,
      };

      const response = await fetch("/api/v1/integrations/save", {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string; detail?: string };
      if (!response.ok) throw new Error(result.detail || "Unable to save configuration");

      setFeedback({ tone: "ok", text: result.message || "Integration configuration saved securely." });
      setForm((current) => ({ ...current, client_secret: "", api_token: "", personal_access_token: "", webhook_secret: "" }));
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
      const result = (await response.json()) as { message?: string; detail?: string };
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
      <header className="header">
        <div>
          <h1>Integration Configuration</h1>
          <p className="tenant">Tenant: {tenantId}</p>
          <div className="status-row">
            <span className={`pill ${status.integration_status}`}>{statusLabel}</span>
            <span className="pill">Last Sync: {status.last_successful_sync ? new Date(status.last_successful_sync).toLocaleString() : "—"}</span>
          </div>
        </div>
      </header>

      <section className="card">
        <h2>Primary Tool Selection</h2>
        {status.configuration_locked && (
          <p className="warn-text">Changing primary tool will reset all integration mappings.</p>
        )}
        <div className="radio-row">
          <label>
            <input
              type="radio"
              name="toolType"
              checked={toolType === "JIRA"}
              onChange={() => setToolType("JIRA")}
              disabled={Boolean(lockedToDifferentTool && !form.reset_confirmed)}
            />
            Jira
          </label>
          <label>
            <input
              type="radio"
              name="toolType"
              checked={toolType === "AZURE_DEVOPS"}
              onChange={() => setToolType("AZURE_DEVOPS")}
              disabled={Boolean(lockedToDifferentTool && !form.reset_confirmed)}
            />
            Azure DevOps
          </label>
        </div>
        {status.configuration_locked && status.tool_type !== toolType && (
          <label className="reset-check">
            <input
              type="checkbox"
              checked={form.reset_confirmed}
              onChange={(event) => updateField("reset_confirmed", event.target.checked)}
            />
            I understand and want to reset integration mappings.
          </label>
        )}
      </section>

      <form className="card" onSubmit={onTestConnection}>
        <h2>{toolType === "JIRA" ? "Jira Configuration" : "Azure DevOps Configuration"}</h2>

        <div className="grid two">
          <label>
            {toolType === "JIRA" ? "Jira Base URL" : "Organization URL"}
            <input
              required
              placeholder={toolType === "JIRA" ? "https://client.atlassian.net" : "https://dev.azure.com/client"}
              value={form.base_url}
              onChange={(event) => updateField("base_url", event.target.value)}
            />
          </label>

          {toolType === "AZURE_DEVOPS" && (
            <label>
              Tenant ID
              <input value={form.tenant_identifier} onChange={(event) => updateField("tenant_identifier", event.target.value)} />
            </label>
          )}

          <label>
            Client ID
            <input value={form.client_id} onChange={(event) => updateField("client_id", event.target.value)} />
          </label>

          <label>
            Client Secret
            <input type="password" autoComplete="new-password" value={form.client_secret} onChange={(event) => updateField("client_secret", event.target.value)} />
          </label>

          {toolType === "JIRA" ? (
            <label>
              API Token
              <input type="password" autoComplete="new-password" value={form.api_token} onChange={(event) => updateField("api_token", event.target.value)} />
            </label>
          ) : (
            <label>
              Personal Access Token (optional)
              <input
                type="password"
                autoComplete="new-password"
                value={form.personal_access_token}
                onChange={(event) => updateField("personal_access_token", event.target.value)}
              />
            </label>
          )}

          <label>
            {toolType === "JIRA" ? "Default Project Key (optional)" : "Default Project Name"}
            <input value={form.default_project} onChange={(event) => updateField("default_project", event.target.value)} />
          </label>

          <label>
            Webhook Secret
            <input
              required
              type="password"
              autoComplete="new-password"
              value={form.webhook_secret}
              onChange={(event) => updateField("webhook_secret", event.target.value)}
            />
          </label>
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
        .config-shell {
          min-height: 100vh;
          background: #f8fafc;
          color: #1f2937;
          padding: 32px;
          font-family: Inter, Segoe UI, Arial, sans-serif;
        }
        .header h1 { margin: 0; color: #1e3a8a; font-size: 30px; }
        .tenant { color: #6b7280; margin: 8px 0; }
        .status-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill { font-size: 12px; padding: 6px 10px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; }
        .pill.connected { color: #166534; border-color: #bbf7d0; }
        .pill.disconnected { color: #991b1b; border-color: #fecaca; }
        .pill.token_expired { color: #92400e; border-color: #fde68a; }
        .card {
          margin-top: 16px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }
        .card h2 { margin: 0 0 12px; font-size: 18px; }
        .warn-text { color: #92400e; margin: 0 0 10px; font-size: 14px; }
        .radio-row { display: flex; gap: 16px; }
        .radio-row label { display: inline-flex; gap: 8px; align-items: center; }
        .reset-check { margin-top: 12px; display: inline-flex; gap: 8px; color: #4b5563; }
        .grid { display: grid; gap: 12px; }
        .grid.two { grid-template-columns: 1fr 1fr; }
        label { display: grid; gap: 6px; font-size: 13px; color: #374151; }
        input {
          height: 42px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 12px;
          outline: none;
        }
        input:focus { border-color: #1e3a8a; box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.12); }
        .actions { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
        .btn {
          border: 0;
          border-radius: 8px;
          height: 40px;
          padding: 0 14px;
          font-weight: 600;
          cursor: pointer;
          background: #1e3a8a;
          color: #fff;
        }
        .btn.secondary { background: #fff; color: #1f2937; border: 1px solid #d1d5db; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .feedback { margin: 12px 0 0; font-size: 14px; }
        .feedback.ok { color: #16a34a; }
        .feedback.error { color: #dc2626; }
        .feedback.warn { color: #92400e; }
        .health-grid p { margin: 0; color: #4b5563; }
        @media (max-width: 900px) {
          .config-shell { padding: 20px; }
          .grid.two { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
