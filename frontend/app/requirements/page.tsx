"use client";

import { FormEvent, useState } from "react";
import TopMenu from "../components/top-menu";

type GeneratedStory = {
  story_id: string;
  title: string;
  story: string;
  priority: string;
  acceptance_criteria: string[];
};

type BacklogItem = {
  item_id: string;
  type: string;
  description: string;
  mapped_story_id: string;
  estimate_points: number;
};

type ConversionResponse = {
  summary: string;
  user_stories: GeneratedStory[];
  product_backlog_items: BacklogItem[];
};

export default function RequirementsIntakePage() {
  const [tenantId] = useState("tenant-acme");
  const [projectId, setProjectId] = useState("tenant-acme-JIRA-101");
  const [sourceText, setSourceText] = useState(
    "Business asks for password reset audit logs.\nNeed role-based visibility for dashboard widgets.\nManager wants sprint quality summary every Friday.",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConversionResponse | null>(null);

  const onConvert = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/ai/requirements-to-backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, project_id: projectId, source_text: sourceText }),
      });

      if (!response.ok) {
        throw new Error("Could not convert requirements. Please retry.");
      }

      const payload = (await response.json()) as ConversionResponse;
      setResult(payload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unexpected conversion error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="requirements-shell">
      <TopMenu current="requirements" />

      <header>
        <h1>Requirements Intake & Backlog Conversion</h1>
        <p>Paste meeting transcripts or requirement notes to generate user stories and product backlog items.</p>
      </header>

      <form className="card" onSubmit={onConvert}>
        <div className="grid two">
          <label>
            Tenant ID
            <input value={tenantId} disabled />
          </label>
          <label>
            Project ID
            <input value={projectId} onChange={(event) => setProjectId(event.target.value)} required />
          </label>
        </div>

        <label>
          Requirement transcript / notes
          <textarea
            rows={10}
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste call notes, BRD text, or workshop transcript"
            required
          />
        </label>

        <div className="actions">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Converting..." : "Convert to User Stories & Backlog"}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </form>

      {result && (
        <section className="results-grid">
          <article className="card">
            <h2>Generated User Stories</h2>
            <p className="summary">{result.summary}</p>
            <div className="stack">
              {result.user_stories.map((story) => (
                <div key={story.story_id} className="item">
                  <div className="item-head">
                    <strong>{story.story_id}</strong>
                    <span className="badge">{story.priority}</span>
                  </div>
                  <p>{story.story}</p>
                  <ul>
                    {story.acceptance_criteria.map((criterion) => (
                      <li key={criterion}>{criterion}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <h2>Product Backlog Items</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Story</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {result.product_backlog_items.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_id}</td>
                    <td>{item.type}</td>
                    <td>{item.description}</td>
                    <td>{item.mapped_story_id}</td>
                    <td>{item.estimate_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      )}

      <style jsx>{`
        .requirements-shell {
          min-height: 100vh;
          background: #f8fafc;
          color: #1f2937;
          padding: 32px;
          font-family: Inter, Segoe UI, Arial, sans-serif;
        }
        header h1 { margin: 0; color: #1e3a8a; font-size: 30px; }
        header p { color: #6b7280; margin: 8px 0 16px; }
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }
        .grid { display: grid; gap: 12px; }
        .grid.two { grid-template-columns: 1fr 1fr; }
        label { display: grid; gap: 6px; margin-bottom: 12px; font-size: 13px; color: #374151; }
        input, textarea {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          outline: none;
          background: #fff;
          font: inherit;
        }
        input:focus, textarea:focus { border-color: #1e3a8a; box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.12); }
        .actions { margin-top: 8px; }
        .btn {
          background: #1e3a8a;
          color: #fff;
          border: 0;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { color: #dc2626; margin: 10px 0 0; }
        .results-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 14px;
        }
        .summary { color: #4b5563; margin-top: 0; }
        .stack { display: grid; gap: 10px; }
        .item { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
        .item-head { display: flex; justify-content: space-between; align-items: center; }
        .badge { background: #eef2ff; color: #4338ca; border-radius: 999px; padding: 4px 8px; font-size: 12px; }
        ul { margin: 8px 0 0; padding-left: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px 6px; font-size: 13px; }
        th { color: #475569; }
        @media (max-width: 1000px) {
          .requirements-shell { padding: 20px; }
          .grid.two, .results-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
