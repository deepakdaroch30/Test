"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopMenu from "../components/top-menu";

type IntegrationType = "JIRA" | "AZURE_DEVOPS";
type SprintHealth = "green" | "amber" | "red";
type SyncFreshness = "fresh" | "delayed" | "stale";

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
  data: WorkspaceProject[];
};

type WorkspaceApiResponse = {
  success: boolean;
  data?: WorkspaceProject[];
  error?: string;
};

const fallbackData: WorkspaceResponse = {
  workspace_name: "Acme Quality Workspace",
  integration_type: "JIRA",
  integration_healthy: true,
  integration_status_message: "Connected to Jira",
  last_sync_time: new Date().toISOString(),
  can_configure_integration: true,
  data: [
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
      last_sync_time: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      can_enter_project: true,
    },
  ],
};

const HEALTH_SEVERITY: Record<SprintHealth, number> = { red: 0, amber: 1, green: 2 };
const TARGETS = { testCoverage: 80, automationCoverage: 70 };

const trendForMetric = (value: number, target: number): string => {
  if (value >= target + 5) return "▲ +5 vs last sprint";
  if (value >= target) return "▲ +2 vs last sprint";
  if (value >= target - 5) return "▼ -2 vs last sprint";
  return "▼ -6 vs last sprint";
};

const healthDetails: Record<SprintHealth, { icon: string; label: string; helper: string }> = {
  green: { icon: "✓", label: "On Track", helper: "Milestones are on schedule and quality risk is low." },
  amber: { icon: "!", label: "At Risk", helper: "Quality risk or execution slippage requires active monitoring." },
  red: { icon: "✕", label: "Blocked", helper: "Critical issues are blocking sprint quality outcomes." },
};

const getSyncFreshness = (iso: string): SyncFreshness => {
  const ageMinutes = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (ageMinutes <= 60) return "fresh";
  if (ageMinutes <= 240) return "delayed";
  return "stale";
};

export default function WorkspaceDashboardPage() {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeHealthFilter, setActiveHealthFilter] = useState<"all" | SprintHealth>("all");
  const [activeFrameworkFilter, setActiveFrameworkFilter] = useState<"all" | "Playwright" | "Selenium">("all");
  const [showHealthTip, setShowHealthTip] = useState(false);
  const [showSyncTip, setShowSyncTip] = useState(false);
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

        const payload = (await response.json()) as WorkspaceApiResponse;
        if (active) {
          console.log("Workspace API response:", payload);
          const projects = payload?.data ?? [];
          setData({ ...fallbackData, data: projects });
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
  const toolLabel = model?.integration_type === "JIRA" ? "Connected to Jira" : "Connected to Azure DevOps";
  const toolIcon = model?.integration_type === "JIRA" ? "J" : "A";
  const syncLabel = useMemo(() => new Date(model?.last_sync_time ?? fallbackData.last_sync_time).toLocaleString(), [model?.last_sync_time]);
  const syncFreshness = getSyncFreshness(model?.last_sync_time ?? fallbackData.last_sync_time);

  const visibleProjects = useMemo(() => {
    const projects = model?.data || [];
    return [...projects]
      .sort((a, b) => HEALTH_SEVERITY[a?.sprint_health_score ?? "red"] - HEALTH_SEVERITY[b?.sprint_health_score ?? "red"])
      .filter((project) => activeHealthFilter === "all" || project?.sprint_health_score === activeHealthFilter)
      .filter((project) => activeFrameworkFilter === "all" || project?.framework_type === activeFrameworkFilter);
  }, [activeFrameworkFilter, activeHealthFilter, model?.data]);

  return (
    <main className="workspace-shell">
      <section className="nav-shell" aria-label="Primary workspace navigation">
        <p className="nav-label">Navigation</p>
        <TopMenu current="workspace" />
      </section>

      <header className="workspace-header">
        <div>
          <h1>{model.workspace_name}</h1>
          <div className="meta-row">
            <span className="tool-badge" title="Current connected delivery tool">
              <span className="tool-icon" aria-hidden="true">
                {toolIcon}
              </span>
              {toolLabel}
            </span>
            <button className={`health-badge ${model.integration_healthy ? "healthy" : "disconnected"}`} type="button" onClick={() => setShowHealthTip((current) => !current)} aria-expanded={showHealthTip}>
              <span className="dot" />
              {model.integration_healthy ? "Healthy" : "Disconnected"}
            </button>
            <button className={`sync-time ${syncFreshness}`} type="button" onClick={() => setShowSyncTip((current) => !current)} aria-expanded={showSyncTip}>
              Last sync: {syncLabel}
            </button>
          </div>
          {(showHealthTip || showSyncTip) && (
            <div className="status-help" role="note">
              {showHealthTip && <p><strong>Healthy:</strong> Data sync is operating and auth credentials are valid.</p>}
              {showSyncTip && <p><strong>Sync interval:</strong> Expected refresh every 60 minutes. Fresh ≤ 1h, delayed ≤ 4h, stale &gt; 4h.</p>}
            </div>
          )}
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

      <section className="filter-row" aria-label="Project filters">
        <label>
          Sprint Health
          <select value={activeHealthFilter} onChange={(event) => setActiveHealthFilter(event.target.value as "all" | SprintHealth)}>
            <option value="all">All</option>
            <option value="red">Blocked</option>
            <option value="amber">At Risk</option>
            <option value="green">On Track</option>
          </select>
        </label>
        <label>
          Test Framework
          <select value={activeFrameworkFilter} onChange={(event) => setActiveFrameworkFilter(event.target.value as "all" | "Playwright" | "Selenium") }>
            <option value="all">All</option>
            <option value="Playwright">Playwright</option>
            <option value="Selenium">Selenium</option>
          </select>
        </label>
      </section>

      {isLoading ? (
        <div className="loading">Loading workspace projects...</div>
      ) : (
        <section className="project-grid">
          {visibleProjects.map((project) => {
            const health = healthDetails[project?.sprint_health_score ?? "red"];
            const ctaLabel = project?.sprint_health_score === "red" ? "Review Issues" : project?.sprint_health_score === "amber" ? "Investigate Risks" : "View Details";
            return (
              <article key={project.project_id} className={`project-card ${project?.sprint_health_score ?? "red"}`}>
                <div className="card-head">
                  <h2>{project?.project_name}</h2>
                  <div className="card-actions">
                    <span className="tool-mini">{project.integration_type === "JIRA" ? "Jira" : "ADO"}</span>
                    <button className="quick-menu" aria-label={`Quick actions for ${project?.project_name}`} onClick={() => window.alert("Quick actions: Open overview, trigger sync, assign owner")}>⋯</button>
                  </div>
                </div>
                <p className="sprint">Active sprint: {project?.active_sprint}</p>

                <div className="health-row" aria-label={`Sprint health ${health?.label}`}>
                  <span className={`health-chip ${project?.sprint_health_score ?? "red"}`}>
                    <span className="health-icon" aria-hidden="true">{health.icon}</span>
                    {health.label}
                  </span>
                  <span className="health-helper">{health.helper}</span>
                </div>

                <div className="metric-row">
                  <div>
                    <span className="label">Test Coverage</span>
                    <strong>{project?.test_coverage_percent ?? 0}%</strong>
                    <div className="meter" role="img" aria-label={`Test coverage ${project?.test_coverage_percent ?? 0} percent, target ${TARGETS.testCoverage}`}>
                      <span style={{ width: `${project?.test_coverage_percent ?? 0}%` }} />
                    </div>
                    <span className="sub-label">Target: {TARGETS.testCoverage}% · {trendForMetric(project?.test_coverage_percent ?? 0, TARGETS.testCoverage)}</span>
                  </div>
                  <div>
                    <span className="label">Automation Coverage</span>
                    <strong>{project?.automation_coverage_percent ?? 0}%</strong>
                    <div className="meter" role="img" aria-label={`Automation coverage ${project?.automation_coverage_percent ?? 0} percent, target ${TARGETS.automationCoverage}`}>
                      <span style={{ width: `${project?.automation_coverage_percent ?? 0}%` }} />
                    </div>
                    <span className="sub-label">Target: {TARGETS.automationCoverage}% · {trendForMetric(project?.automation_coverage_percent ?? 0, TARGETS.automationCoverage)}</span>
                  </div>
                </div>

                <div className="metric-row">
                  <div>
                    <span className="label">Framework</span>
                    <strong>{project?.framework_type}</strong>
                  </div>
                  <div>
                    <span className="label">Last Sync</span>
                    <strong>{new Date(project?.last_sync_time ?? fallbackData.last_sync_time).toLocaleString()}</strong>
                  </div>
                </div>

                <button
                  className="btn"
                  disabled={!project?.can_enter_project}
                  onClick={() => router.push(`/project/${project?.project_id}/overview`)}
                >
                  {ctaLabel}
                </button>
              </article>
            );
          })}
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

        .nav-shell {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          padding: 10px 12px 2px;
          margin-bottom: 18px;
        }

        .nav-label {
          margin: 2px 0 8px;
          color: #6b7280;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
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

        .health-badge,
        .sync-time {
          cursor: pointer;
        }

        .sync-time.fresh {
          color: #166534;
          border-color: #bbf7d0;
        }

        .sync-time.delayed {
          color: #92400e;
          border-color: #fde68a;
        }

        .sync-time.stale {
          color: #991b1b;
          border-color: #fecaca;
        }

        .status-help {
          margin-top: 10px;
          border: 1px solid #dbeafe;
          border-radius: 10px;
          background: #eff6ff;
          padding: 10px 12px;
          color: #1e3a8a;
          font-size: 13px;
          max-width: 720px;
        }

        .status-help p {
          margin: 4px 0;
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

        .filter-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 10px;
        }

        .filter-row label {
          display: grid;
          gap: 6px;
          font-size: 12px;
          color: #4b5563;
          font-weight: 600;
        }

        .filter-row select {
          height: 36px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 10px;
          background: #fff;
          color: #1f2937;
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

        .project-card.red {
          border-color: #fecaca;
        }

        .project-card.amber {
          border-color: #fde68a;
        }

        .project-card.green {
          border-color: #bbf7d0;
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

        .card-actions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .quick-menu {
          border: 1px solid #d1d5db;
          background: #fff;
          color: #4b5563;
          border-radius: 8px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          font-weight: 700;
          line-height: 1;
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

        .health-row {
          display: grid;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .health-helper {
          font-size: 12px;
          color: #4b5563;
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

        .sub-label {
          display: block;
          margin-top: 6px;
          color: #4b5563;
          font-size: 12px;
        }

        .meter {
          margin-top: 8px;
          height: 8px;
          border-radius: 999px;
          background: #e5e7eb;
          overflow: hidden;
        }

        .meter span {
          display: block;
          height: 100%;
          background: #1e3a8a;
        }

        .health-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          font-size: 12px;
          padding: 3px 9px;
          font-weight: 700;
        }

        .health-icon {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid currentColor;
          font-size: 10px;
          font-weight: 700;
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
