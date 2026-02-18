import { useEffect, useState } from "react";
import {
  RepoTestCase,
  SuggestedTestCase,
  getSuggestedTestCases,
  getTestRepo,
  postTestCaseLink,
} from "../services/api";

type TestCaseReviewPanelProps = {
  storyId: string;
};

export default function TestCaseReviewPanel({ storyId }: TestCaseReviewPanelProps) {
  const [suggested, setSuggested] = useState<SuggestedTestCase[]>([]);
  const [repoCases, setRepoCases] = useState<RepoTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [suggestedPayload, repoPayload] = await Promise.all([
          getSuggestedTestCases(storyId),
          getTestRepo(),
        ]);

        if (active) {
          setSuggested(suggestedPayload);
          setRepoCases(repoPayload);
        }
      } catch {
        if (active) {
          setError("Unable to load test case suggestions.");
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
  }, [storyId]);

  const updateSuggested = (id: string, patch: Partial<SuggestedTestCase>) => {
    setSuggested((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const linkExisting = async (testCaseId: string) => {
    setError(null);
    setNotice(null);
    try {
      await postTestCaseLink(storyId, testCaseId);
      setRepoCases((current) => current.map((item) => (item.id === testCaseId ? { ...item, linked: true } : item)));
      setNotice("Existing test case linked.");
    } catch {
      setError("Unable to link existing test case.");
    }
  };

  const useSuggested = async (testCase: SuggestedTestCase) => {
    setError(null);
    setNotice(null);
    try {
      await postTestCaseLink(storyId, testCase.id);
      updateSuggested(testCase.id, { linked: true });
      setNotice("Suggested test case added.");
    } catch {
      setError("Unable to save suggested test case.");
    }
  };

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Test Case Suggestions Review</h3>

      {isLoading ? (
        <p>Loading suggestions...</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 12 }}>
            {suggested.map((testCase) => (
              <article key={testCase.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{testCase.title}</strong>
                  <span style={{ fontSize: 12, color: "#4b5563" }}>Similarity: {Math.round(testCase.similarityScore * 100)}%</span>
                </div>

                <ol>
                  {testCase.steps.map((step, idx) => (
                    <li key={`${testCase.id}-step-${idx}`}>
                      <input
                        value={step}
                        onChange={(event) => {
                          const next = [...testCase.steps];
                          next[idx] = event.target.value;
                          updateSuggested(testCase.id, { steps: next });
                        }}
                        style={{ width: "100%" }}
                        aria-label={`Step ${idx + 1}`}
                      />
                    </li>
                  ))}
                </ol>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" disabled={Boolean(testCase.linked)} onClick={() => useSuggested(testCase)}>
                    {testCase.linked ? "Linked" : "Use Suggested"}
                  </button>
                  <button type="button" onClick={() => updateSuggested(testCase.id, { title: `${testCase.title} (Edited)` })}>
                    Edit Suggested
                  </button>
                </div>
              </article>
            ))}
          </div>

          <h4 style={{ marginTop: 16 }}>Existing Similar Test Cases</h4>
          <div style={{ display: "grid", gap: 10 }}>
            {repoCases.map((testCase) => (
              <article key={testCase.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{testCase.title}</strong>
                  <span style={{ fontSize: 12, color: "#4b5563" }}>Similarity: {Math.round(testCase.similarityScore * 100)}%</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" disabled={Boolean(testCase.linked)} onClick={() => linkExisting(testCase.id)}>
                    {testCase.linked ? "Already Linked" : "Link Existing"}
                  </button>
                  {testCase.link && (
                    <a href={testCase.link} target="_blank" rel="noreferrer">
                      Open Existing
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {notice && <p style={{ color: "#166534", marginBottom: 0 }}>{notice}</p>}
      {error && <p style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>}
    </section>
  );
}
