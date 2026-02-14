"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TopMenu from "../../../components/top-menu";

type ToolType = "JIRA" | "AZURE_DEVOPS";

type OverviewModel = {
  project_id: string;
  project_name: string;
  tool_type: ToolType;
  active_sprint: string;
  sprint_dates: { start: string; end: string };
  framework: "Playwright" | "Selenium";
  language: "Python" | "JavaScript" | "Java";
  integration_status: string;
  integration_healthy: boolean;
  last_sync_time: string;
  total_stories: number;
  stories_with_tests_percent: number;
  negative_coverage_percent: number;
  automation_coverage_percent: number;
  execution_pass_rate_percent: number;
  requirement_quality_avg: number;
  dod_compliance_status: {
    test_cases_created: boolean;
    negative_tests_present: boolean;
    automation_generated_for_eligible: boolean;
    rtm_linked: boolean;
    latest_execution_passed: boolean;
  };
  risk_distribution: { high: number; medium: number; low: number };
  execution_summary: {
    last_run_status: string;
    total_executed: number;
    passed: number;
    failed: number;
    flaky: number;
    duration: string;
  };
  can_view_sprint_stories: boolean;
};

const fallback: OverviewModel = {
  project_id: "tenant-acme-JIRA-101",
  project_name: "Payments QA",
  tool_type: "JIRA",
  active_sprint: "Sprint 24",
  sprint_dates: { start: "2026-02-01", end: "2026-02-14" },
  framework: "Playwright",
  language: "Python",
  integration_status: "Connected to Jira",
  integration_healthy: true,
  last_sync_time: new Date().toISOString(),
  total_stories: 20,
  stories_with_tests_percent: 88,
  negative_coverage_percent: 64,
  automation_coverage_percent: 58,
  execution_pass_rate_percent: 91,
  requirement_quality_avg: 7.8,
  dod_compliance_status: {
    test_cases_created: true,
    negative_tests_present: true,
    automation_generated_for_eligible: true,
    rtm_linked: true,
    latest_execution_passed: true,
  },
  risk_distribution: { high: 3, medium: 9, low: 8 },
  execution_summary: {
    last_run_status: "passed",
    total_executed: 142,
    passed: 129,
    failed: 9,
    flaky: 4,
    duration: "8m 41s",
  },
  can_view_sprint_stories: true,
};

function metricTone(value: number, healthy: number, warn: number): "good" | "warn" | "bad" {
  if (value >= healthy) return "good";
  if (value >= warn) return "warn";
  return "bad";
}

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? fallback.project_id;
  const [data, setData] = useState<OverviewModel | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(`/api/v1/project/${projectId}/overview`, {
          headers: {
            "x-tenant-id": "tenant-acme",
            "x-user-role": "qa_lead",
          },
        });
        if (!response.ok) throw new Error("failed");
        const payload = (await response.json()) as OverviewModel;
        if (active) setData(payload);
      } catch {
        if (active) setData({ ...fallback, project_id: projectId });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [projectId]);

  const model = data ?? fallback;
  const syncTime = useMemo(() => new Date(model.last_sync_time).toLocaleString(), [model.last_sync_time]);

  const dodChecks = [
    { label: "Test Cases Created", pass: model.dod_compliance_status.test_cases_created },
    { label: "Negative Tests Present", pass: model.dod_compliance_status.negative_tests_present },
    { label: "Automation Generated (eligible)", pass: model.dod_compliance_status.automation_generated_for_eligible },
    { label: "RTM Linked", pass: model.dod_compliance_status.rtm_linked },
    { label: "Latest Execution Passed", pass: model.dod_compliance_status.latest_execution_passed },
  ];

  const riskTotal = model.risk_distribution.high + model.risk_distribution.medium + model.risk_distribution.low;

  return (
    <main className="overview-shell">
      <TopMenu current="project" />
      <header className="overview-header">
        <div>
          <h1>{model.project_name}</h1>
          <div className="meta-row">
            <span className="pill">{model.tool_type === "JIRA" ? "Connected to Jira" : "Connected to Azure DevOps"}</span>
            <span className="pill">{model.active_sprint}</span>
            <span className="pill">
              Sprint Duration: {model.sprint_dates.start} to {model.sprint_dates.end}
            </span>
            <span className="pill">Framework: {model.framework}</span>
            <span className="pill">Language: {model.language}</span>
            <span className={`pill ${model.integration_healthy ? "healthy" : "bad"}`}>{model.integration_status}</span>
            <span className="pill">Last Sync: {syncTime}</span>
          </div>
        </div>

        <Link className={`btn ${!model.can_view_sprint_stories ? "disabled" : ""}`} href="#" aria-disabled={!model.can_view_sprint_stories}>
          View Sprint Stories
        </Link>
      </header>

      {!model.integration_healthy && (
        <div className="banner" role="alert">
          Integration is disconnected. Story navigation is disabled until connection health is restored.
        </div>
      )}

      <section className="kpi-grid">
        <article className={`kpi ${metricTone(model.total_stories >= 15 ? 100 : 0, 80, 40)}`}>
          <span>Total Stories</span>
          <strong>{model.total_stories}</strong>
        </article>
        <article className={`kpi ${metricTone(model.stories_with_tests_percent, 85, 65)}`}>
          <span>Stories with Test Cases</span>
          <strong>{model.stories_with_tests_percent}%</strong>
        </article>
        <article className={`kpi ${metricTone(model.negative_coverage_percent, 70, 50)}`}>
          <span>Negative Test Coverage</span>
          <strong>{model.negative_coverage_percent}%</strong>
        </article>
        <article className={`kpi ${metricTone(model.automation_coverage_percent, 70, 50)}`}>
          <span>Automation Coverage</span>
          <strong>{model.automation_coverage_percent}%</strong>
        </article>
        <article className={`kpi ${metricTone(model.execution_pass_rate_percent, 85, 70)}`}>
          <span>Execution Pass Rate</span>
          <strong>{model.execution_pass_rate_percent}%</strong>
        </article>
        <article className={`kpi ${metricTone(Math.round(model.requirement_quality_avg * 10), 75, 60)}`}>
          <span>Requirement Quality Score</span>
          <strong>{model.requirement_quality_avg.toFixed(1)}/10</strong>
        </article>
      </section>

      <section className="two-col">
        <article className="panel">
          <h2>Definition of Done Compliance</h2>
          {dodChecks.some((item) => !item.pass) && <p className="warn">Some DoD criteria are incomplete for this sprint.</p>}
          <ul>
            {dodChecks.map((item) => (
              <li key={item.label} className={item.pass ? "ok" : "bad"}>
                <span>{item.pass ? "●" : "○"}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Risk Distribution</h2>
          <div className="risk-bar" aria-label="Risk distribution">
            <span className="high" style={{ width: `${(model.risk_distribution.high / riskTotal) * 100}%` }} />
            <span className="medium" style={{ width: `${(model.risk_distribution.medium / riskTotal) * 100}%` }} />
            <span className="low" style={{ width: `${(model.risk_distribution.low / riskTotal) * 100}%` }} />
          </div>
          <div className="risk-legend">
            <p className="bad">High: {model.risk_distribution.high}</p>
            <p className="warn">Medium: {model.risk_distribution.medium}</p>
            <p className="ok">Low: {model.risk_distribution.low}</p>
          </div>
        </article>
      </section>

      <section className="two-col">
        <article className="panel">
          <h2>Execution Summary</h2>
          <div className="grid-two">
            <p>Last CI Run: <strong>{model.execution_summary.last_run_status}</strong></p>
            <p>Total Executed: <strong>{model.execution_summary.total_executed}</strong></p>
            <p>Pass Count: <strong>{model.execution_summary.passed}</strong></p>
            <p>Fail Count: <strong>{model.execution_summary.failed}</strong></p>
            <p>Flaky Tests: <strong>{model.execution_summary.flaky}</strong></p>
            <p>Duration: <strong>{model.execution_summary.duration}</strong></p>
          </div>
        </article>

        <article className="panel">
          <h2>Activity Timeline</h2>
          <ol className="timeline">
            <li>Test cases generated for active sprint</li>
            <li>Automation scripts committed to feature branch</li>
            <li>CI workflow executed and results synced</li>
            <li>Story QA-145 marked Done after DoD compliance</li>
          </ol>
        </article>
      </section>

      <style jsx>{`
        .overview-shell {
          min-height: 100vh;
          background: #f8fafc;
          color: #1f2937;
          padding: 32px;
          font-family: Inter, Segoe UI, Arial, sans-serif;
        }
        .overview-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }
        h1 {
          margin: 0;
          font-size: 30px;
          color: #1e3a8a;
        }
        .meta-row {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pill {
          font-size: 12px;
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 999px;
          padding: 6px 10px;
        }
        .pill.healthy { color: #166534; border-color: #bbf7d0; }
        .pill.bad { color: #991b1b; border-color: #fecaca; }
        .btn {
          height: 40px;
          display: inline-flex;
          align-items: center;
          padding: 0 14px;
          border-radius: 8px;
          color: #fff;
          background: #1e3a8a;
          text-decoration: none;
          font-weight: 600;
        }
        .btn.disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .banner {
          margin-top: 16px;
          margin-bottom: 10px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #b91c1c;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .kpi-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }
        .kpi {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .kpi:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 20px rgba(15, 23, 42, 0.09);
        }
        .kpi span { display: block; color: #6b7280; font-size: 12px; margin-bottom: 8px; }
        .kpi strong { font-size: 24px; }
        .kpi.good { border-color: #bbf7d0; }
        .kpi.warn { border-color: #fde68a; }
        .kpi.bad { border-color: #fecaca; }
        .two-col {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .panel {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }
        .panel h2 { margin: 0 0 12px; font-size: 18px; }
        ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 9px; }
        li { display: flex; gap: 8px; align-items: center; font-size: 14px; }
        .ok { color: #166534; }
        .warn { color: #92400e; }
        .bad { color: #991b1b; }
        .risk-bar {
          width: 100%;
          height: 16px;
          border-radius: 999px;
          overflow: hidden;
          display: flex;
          background: #f3f4f6;
        }
        .risk-bar .high { background: #dc2626; }
        .risk-bar .medium { background: #f59e0b; }
        .risk-bar .low { background: #16a34a; }
        .risk-legend { margin-top: 10px; display: flex; gap: 12px; flex-wrap: wrap; }
        .risk-legend p { margin: 0; }
        .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .grid-two p { margin: 0; color: #4b5563; }
        .timeline { margin: 0; padding-left: 18px; display: grid; gap: 10px; color: #4b5563; }
        @media (max-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 860px) {
          .overview-shell { padding: 20px; }
          .overview-header { flex-direction: column; }
          .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .two-col { grid-template-columns: 1fr; }
          .grid-two { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
