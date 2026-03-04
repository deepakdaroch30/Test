"use client";

import { useMemo, useState } from "react";

type ToolType = "JIRA" | "ZEPHYR";

type StoryItem = {
  key: string;
  project_id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  priority: string;
};

type GeneratedTestCase = {
  precondition: string;
  steps: string[];
  expected_result: string;
  risk_level: string;
  automation_eligible: boolean;
  type: string;
};

type EditableCase = GeneratedTestCase & {
  id: string;
  story_id: string;
};

const fallbackStories: StoryItem[] = [
  {
    key: "KAN-421",
    project_id: "tenant-acme-JIRA-101",
    title: "Password reset audit trail",
    description: "As a QA lead, I want all password reset events audited for compliance.",
    acceptance_criteria: ["Audit event stored with actor and timestamp", "Audit data available in compliance report"],
    priority: "HIGH",
  },
  {
    key: "KAN-422",
    project_id: "tenant-acme-JIRA-101",
    title: "Role-based dashboard widgets",
    description: "As a user, I only see widgets allowed for my role.",
    acceptance_criteria: ["Restricted widgets hidden", "Access denied shown for forced direct URL"],
    priority: "MEDIUM",
  },
];

export default function StorySelectionPage() {
  const [tenantId] = useState("tenant-acme");
  const [projectId, setProjectId] = useState("tenant-acme-JIRA-101");
  const [releaseName, setReleaseName] = useState("Current Release");
  const [targetTool, setTargetTool] = useState<ToolType>("ZEPHYR");
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [editableCases, setEditableCases] = useState<EditableCase[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const visibleStories = useMemo(() => stories.filter((story) => story.project_id === projectId), [projectId, stories]);

  const fetchStories = async () => {
    setError("");
    setSuccess("");
    setIsFetching(true);
    setEditableCases([]);
    setSelectedStoryIds([]);

    try {
      const response = await fetch(`/api/v1/stories?tenant_id=${tenantId}&release=${encodeURIComponent(releaseName)}`);
      if (!response.ok) {
        throw new Error("Unable to load stories from current release.");
      }

      const payload = (await response.json()) as StoryItem[];
      setStories(Array.isArray(payload) && payload.length > 0 ? payload : fallbackStories);
    } catch (caughtError) {
      setStories(fallbackStories);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load stories.");
    } finally {
      setIsFetching(false);
    }
  };

  const toggleStory = (storyId: string) => {
    setSelectedStoryIds((current) => (current.includes(storyId) ? current.filter((id) => id !== storyId) : [...current, storyId]));
  };

  const updateCase = (id: string, key: keyof EditableCase, value: string | boolean | string[]) => {
    setEditableCases((current) =>
      current.map((testCase) => (testCase.id === id ? { ...testCase, [key]: value } : testCase)),
    );
  };

  const generateTestCases = async () => {
    if (selectedStoryIds.length === 0) {
      setError("Select at least one story to generate test cases.");
      return;
    }

    setError("");
    setSuccess("");
    setIsGenerating(true);

    try {
      const responses = await Promise.all(
        selectedStoryIds.map(async (storyId) => {
          const response = await fetch("/api/v1/testcases/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ story_id: storyId, gherkin: true }),
          });
          if (!response.ok) {
            throw new Error(`Unable to generate test cases for ${storyId}.`);
          }
          const payload = (await response.json()) as { story_id: string; test_cases: GeneratedTestCase[] };
          return payload;
        }),
      );

      const flattened: EditableCase[] = responses.flatMap((item) =>
        item.test_cases.map((testCase, index) => ({
          ...testCase,
          story_id: item.story_id,
          id: `${item.story_id}-${index}`,
        })),
      );

      setEditableCases(flattened);
      setSuccess(`Generated ${flattened.length} test case(s). Review and edit before pushing.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to generate test cases.");
    } finally {
      setIsGenerating(false);
    }
  };

  const pushToTool = async () => {
    if (editableCases.length === 0) {
      setError("Generate and review test cases before pushing to tool.");
      return;
    }

    setError("");
    setSuccess("");
    setIsPublishing(true);

    try {
      const response = await fetch("/api/v1/testcases/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          project_id: projectId,
          release_name: releaseName,
          tool_type: targetTool,
          test_cases: editableCases.map(({ id, ...rest }) => rest),
        }),
      });

      const payload = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to push test cases to test management tool.");
      }

      setSuccess(payload.message || "Test cases pushed successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to push test cases.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="story-shell">
      <header>
        <h1>Current Release Stories</h1>
        <p>Fetch stories, generate test cases, review/edit, and push to Jira/Zephyr for POC.</p>
      </header>

      <section className="card">
        <div className="grid four">
          <label>
            Tenant ID
            <input value={tenantId} disabled />
          </label>
          <label>
            Project ID
            <input value={projectId} onChange={(event) => setProjectId(event.target.value)} />
          </label>
          <label>
            Release
            <input value={releaseName} onChange={(event) => setReleaseName(event.target.value)} />
          </label>
          <label>
            Push Target
            <select value={targetTool} onChange={(event) => setTargetTool(event.target.value as ToolType)}>
              <option value="ZEPHYR">Zephyr</option>
              <option value="JIRA">Jira</option>
            </select>
          </label>
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={fetchStories} disabled={isFetching}>
            {isFetching ? "Loading..." : "Fetch Stories"}
          </button>
          <button className="btn" onClick={generateTestCases} disabled={isGenerating || selectedStoryIds.length === 0}>
            {isGenerating ? "Generating..." : "Create Test Cases"}
          </button>
          <button className="btn" onClick={pushToTool} disabled={isPublishing || editableCases.length === 0}>
            {isPublishing ? "Pushing..." : `Push to ${targetTool === "ZEPHYR" ? "Zephyr" : "Jira"}`}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </section>

      <section className="card">
        <h2>Story Selection ({visibleStories.length})</h2>
        {visibleStories.length === 0 ? (
          <p className="muted">No stories loaded yet. Click “Fetch Stories”.</p>
        ) : (
          <div className="list">
            {visibleStories.map((story) => (
              <label key={story.key} className="story-row">
                <input type="checkbox" checked={selectedStoryIds.includes(story.key)} onChange={() => toggleStory(story.key)} />
                <div>
                  <strong>{story.key}: {story.title}</strong>
                  <p>{story.description}</p>
                  <small>Priority: {story.priority}</small>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Review & Edit Test Cases ({editableCases.length})</h2>
        {editableCases.length === 0 ? (
          <p className="muted">No test cases generated yet.</p>
        ) : (
          <div className="list">
            {editableCases.map((testCase) => (
              <article key={testCase.id} className="case-card">
                <h3>{testCase.story_id} · {testCase.type.toUpperCase()}</h3>

                <div className="grid two">
                  <label>
                    Precondition
                    <input
                      value={testCase.precondition}
                      onChange={(event) => updateCase(testCase.id, "precondition", event.target.value)}
                    />
                  </label>
                  <label>
                    Expected Result
                    <input
                      value={testCase.expected_result}
                      onChange={(event) => updateCase(testCase.id, "expected_result", event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Steps (one step per line)
                  <textarea
                    rows={4}
                    value={testCase.steps.join("\n")}
                    onChange={(event) => updateCase(testCase.id, "steps", event.target.value.split("\n").filter(Boolean))}
                  />
                </label>

                <div className="grid three">
                  <label>
                    Type
                    <select value={testCase.type} onChange={(event) => updateCase(testCase.id, "type", event.target.value)}>
                      <option value="positive">positive</option>
                      <option value="negative">negative</option>
                    </select>
                  </label>
                  <label>
                    Risk
                    <select value={testCase.risk_level} onChange={(event) => updateCase(testCase.id, "risk_level", event.target.value)}>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={testCase.automation_eligible}
                      onChange={(event) => updateCase(testCase.id, "automation_eligible", event.target.checked)}
                    />
                    Automation Eligible
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .story-shell { min-height: 100vh; color: #1f2937; font-family: Inter, Segoe UI, Arial, sans-serif; }
        header h1 { margin: 0; color: #1e3a8a; font-size: 30px; }
        header p { color: #6b7280; margin: 8px 0 16px; }
        .card { margin-top: 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05); }
        .grid { display: grid; gap: 12px; }
        .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .grid.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        label { display: grid; gap: 6px; font-size: 13px; color: #374151; }
        input, select, textarea { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font: inherit; }
        input, select { height: 40px; }
        .actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
        .btn { border: 0; border-radius: 8px; height: 40px; padding: 0 14px; font-weight: 600; cursor: pointer; background: #1e3a8a; color: #fff; }
        .btn.secondary { background: #fff; color: #1f2937; border: 1px solid #d1d5db; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { color: #dc2626; margin-top: 8px; }
        .success { color: #16a34a; margin-top: 8px; }
        .muted { color: #64748b; }
        .list { display: grid; gap: 10px; margin-top: 10px; }
        .story-row { display: flex; align-items: flex-start; gap: 10px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
        .story-row input { margin-top: 3px; }
        .story-row p { margin: 4px 0; color: #475569; }
        .case-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; display: grid; gap: 10px; }
        .case-card h3 { margin: 0; color: #0f172a; }
        .check { display: flex; align-items: center; gap: 8px; margin-top: 20px; }
        .check input { width: 16px; height: 16px; }
        @media (max-width: 1100px) {
          .grid.four, .grid.three, .grid.two { grid-template-columns: 1fr; }
          .check { margin-top: 0; }
        }
      `}</style>
    </main>
  );
}
