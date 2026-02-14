"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopMenu from "../components/top-menu";

type IntegrationType = "JIRA" | "AZURE_DEVOPS";
type SprintHealth = "green" | "amber" | "red";

type WorkspaceProject = {
  project_id: string;
  project_name: string;
  active_sprint: string;
  test_coverage_percent: number;
  automation_coverage_percent: number;
  sprint_health_score: SprintHealth;
  framework_type: "Playwright" | "Selenium";
  integration_type: IntegrationType;
  last_sync_time: string;
  can_enter_project: boolean;
};

type WorkspaceResponse = {
  workspace_name: string;
  integration_type: IntegrationType;
  integration_healthy: boolean;
  integration_status_message: string;
  last_sync_time: string;
  can_configure_integration: boolean;
  projects: WorkspaceProject[];
};

const fallbackData: WorkspaceResponse = {
  workspace_name: "Acme Quality Workspace",
  integration_type: "JIRA",
  integration_healthy: true,
  integration_status_message: "Connected to Jira",
  last_sync_time: new Date().toISOString(),
  can_configure_integration: true,
  projects: [
    {
      project_id: "tenant-acme-JIRA-101",
      project_name: "Payments QA",
      active_sprint: "Sprint 24",
      test_coverage_percent: 84,
      automation_coverage_percent: 58,
      sprint_health_score: "amber",
      framework_type: "Playwright",
      integration_type: "JIRA",
      last_sync_time: new Date().toISOString(),
      can_enter_project: true,
    },
    {
      project_id: "tenant-acme-JIRA-102",
      project_name: "Identity Platform",
      active_sprint: "Sprint 19",
      test_coverage_percent: 91,
      automation_coverage_percent: 72,
      sprint_health_score: "green",
      framework_type: "Playwright",
      integration_type: "JIRA",
      last_sync_time: new Date().toISOString(),
      can_enter_project: true,
    },
    {
      project_id: "tenant-acme-JIRA-103",
      project_name: "Billing Ops",
      active_sprint: "Sprint 11",
      test_coverage_percent: 62,
      automation_coverage_percent: 35,
      sprint_health_score: "red",
      framework_type: "Selenium",
      integration_type: "JIRA",
      last_sync_time: new Date().toISOString(),
      can_enter_project: true,
    },
  ],
};

export default function WorkspaceDashboardPage() {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/v1/workspace/projects", {
          headers: {
            "x-tenant-id": "tenant-acme",
            "x-user-role": "admin",
            "x-user-id": "u-admin",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load workspace data.");
        }

        const payload = (await response.json()) as WorkspaceResponse;
        if (active) {
          setData(payload);
        }
      } catch {
        if (active) {
          setData(fallbackData);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const model = data ?? fallbackData;
  const toolLabel = model.integration_type === "JIRA" ? "Connected to Jira" : "Connected to Azure DevOps";
  const toolIcon = model.integration_type === "JIRA" ? "J" : "A";
  const syncLabel = useMemo(() => new Date(model.last_sync_time).toLocaleString(), [model.last_sync_time]);

  return (
    <main className="workspace-shell">
      <TopMenu current="workspace" />
      <header className="workspace-header">
        <div>
          <h1>{model.workspace_name}</h1>
          <div className="meta-row">
            <span className="tool-badge">
              <span className="tool-icon" aria-hidden="true">
                {toolIcon}
              </span>
              {toolLabel}
            </span>
            <span className={`health-badge ${model.integration_healthy ? "healthy" : "disconnected"}`}>
              <span className="dot" />
              {model.integration_healthy ? "Healthy" : "Disconnected"}
            </span>
            <span className="sync-time">Last sync: {syncLabel}</span>
          </div>
        </div>
        <div className="header-actions">
          {model.can_configure_integration && <button className="btn secondary" onClick={() => router.push("/integration")}>Configure Integration</button>}
          {model.can_configure_integration && <button className="btn secondary" onClick={() => window.alert("Resync triggered")}>Resync Tool</button>}
        </div>
      </header>

      {!model.integration_healthy && (
        <div className="warning-banner" role="alert">
          {model.integration_status_message}. Project entry is disabled until integration is restored.
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading workspace projects...</div>
      ) : (
        <section className="project-grid">
          {model.projects.map((project) => (
            <article key={project.project_id} className="project-card">
              <div className="card-head">
                <h2>{project.project_name}</h2>
                <span className="tool-mini">{project.integration_type === "JIRA" ? "Jira" : "ADO"}</span>
              </div>
              <p className="sprint">Active sprint: {project.active_sprint}</p>

              <div className="metric-row">
                <div>
                  <span className="label">Test Coverage</span>
                  <strong>{project.test_coverage_percent}%</strong>
                </div>
                <div>
                  <span className="label">Automation Coverage</span>
                  <strong>{project.automation_coverage_percent}%</strong>
                </div>
              </div>

              <div className="metric-row">
                <div>
                  <span className="label">Sprint Health</span>
                  <span className={`health-chip ${project.sprint_health_score}`}>{project.sprint_health_score}</span>
                </div>
                <div>
                  <span className="label">Framework</span>
                  <strong>{project.framework_type}</strong>
                </div>
              </div>

              <button
                className="btn"
                disabled={!project.can_enter_project}
                onClick={() => router.push(`/project/${project.project_id}/overview`)}
              >
                Enter Project
              </button>
            </article>
          ))}
        </section>
      )}

      <style jsx>{`
        .workspace-shell {
          min-height: 100vh;
          background: #f8fafc;
          color: #1f2937;
          padding: 32px;
          font-family: Inter, Segoe UI, Arial, sans-serif;
        }

        .workspace-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          color: #1e3a8a;
        }

        .meta-row {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .tool-badge,
        .health-badge,
        .sync-time {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          border-radius: 999px;
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .tool-icon {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          background: #eef2ff;
          color: #1e3a8a;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }

        .health-badge .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #16a34a;
        }

        .health-badge.disconnected .dot {
          background: #dc2626;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          border: 0;
          border-radius: 8px;
          background: #1e3a8a;
          color: #ffffff;
          height: 40px;
          padding: 0 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }

        .btn.secondary {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #1f2937;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px rgba(30, 58, 138, 0.14);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .warning-banner {
          margin-bottom: 16px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #b91c1c;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
        }

        .loading {
          color: #6b7280;
          padding: 24px 2px;
        }

        .project-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .project-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
          padding: 18px;
          display: grid;
          gap: 14px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .project-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
        }

        .card-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }

        h2 {
          margin: 0;
          font-size: 18px;
        }

        .tool-mini {
          font-size: 11px;
          color: #4338ca;
          background: #eef2ff;
          border-radius: 999px;
          padding: 4px 8px;
          font-weight: 600;
        }

        .sprint {
          margin: 0;
          color: #4b5563;
          font-size: 14px;
        }

        .metric-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .label {
          display: block;
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .health-chip {
          display: inline-block;
          border-radius: 999px;
          font-size: 12px;
          text-transform: capitalize;
          padding: 3px 9px;
          font-weight: 600;
        }

        .health-chip.green {
          background: #dcfce7;
          color: #166534;
        }

        .health-chip.amber {
          background: #fef3c7;
          color: #92400e;
        }

        .health-chip.red {
          background: #fee2e2;
          color: #991b1b;
        }

        @media (max-width: 1080px) {
          .project-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .workspace-shell {
            padding: 20px;
          }

          .workspace-header {
            flex-direction: column;
          }

          .project-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
