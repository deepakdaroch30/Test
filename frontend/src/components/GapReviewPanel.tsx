import { FormEvent, useEffect, useMemo, useState } from "react";
import { Gap, getGaps, postApprovedGaps } from "../services/api";

type GapReviewPanelProps = {
  storyId: string;
  storyTitle: string;
  storyDescription: string;
};

export default function GapReviewPanel({ storyId, storyTitle, storyDescription }: GapReviewPanelProps) {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [editingGapId, setEditingGapId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await getGaps(storyId);
        if (active) {
          setGaps(payload);
        }
      } catch {
        if (active) {
          setError("Unable to load suggested gap questions.");
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

  const updateGapStatus = (gapId: string, status: Gap["status"]) => {
    setGaps((current) => current.map((gap) => (gap.id === gapId ? { ...gap, status } : gap)));
  };

  const beginEdit = (gap: Gap) => {
    setEditingGapId(gap.id);
    setEditedText(gap.text);
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingGapId) return;

    setGaps((current) =>
      current.map((gap) =>
        gap.id === editingGapId
          ? {
              ...gap,
              text: editedText.trim() || gap.text,
              status: "approved",
            }
          : gap,
      ),
    );
    setEditingGapId(null);
    setEditedText("");
  };

  const approvedGaps = useMemo(() => gaps.filter((gap) => gap.status === "approved"), [gaps]);

  const onPostApproved = async () => {
    setIsPosting(true);
    setNotice(null);
    setError(null);
    try {
      await postApprovedGaps(storyId, approvedGaps);
      setNotice("Approved gaps posted as story comment.");
    } catch {
      setError("Unable to post approved gaps.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{storyTitle}</h3>
        <p style={{ margin: "8px 0 0", color: "#4b5563" }}>{storyDescription}</p>
      </header>

      {isLoading ? (
        <p>Loading gap suggestions...</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {gaps.map((gap) => {
            const bg = gap.status === "approved" ? "#dcfce7" : gap.status === "rejected" ? "#f3f4f6" : "#ffffff";
            const border = gap.status === "approved" ? "#bbf7d0" : gap.status === "rejected" ? "#d1d5db" : "#e5e7eb";

            return (
              <article key={gap.id} style={{ border: `1px solid ${border}`, background: bg, borderRadius: 10, padding: 12 }}>
                {editingGapId === gap.id ? (
                  <form onSubmit={saveEdit} style={{ display: "grid", gap: 8 }}>
                    <textarea
                      value={editedText}
                      onChange={(event) => setEditedText(event.target.value)}
                      rows={3}
                      style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: 8 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="submit">Save</button>
                      <button type="button" onClick={() => setEditingGapId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p style={{ margin: 0 }}>{gap.text}</p>
                    <p style={{ margin: "8px 0", fontSize: 12, color: "#6b7280" }}>Status: {gap.status}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button type="button" onClick={() => updateGapStatus(gap.id, "approved")}>Approve</button>
                      <button type="button" onClick={() => beginEdit(gap)}>Edit</button>
                      <button type="button" onClick={() => updateGapStatus(gap.id, "rejected")}>Reject</button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <button type="button" onClick={onPostApproved} disabled={isPosting || approvedGaps.length === 0}>
          {isPosting ? "Posting..." : "Post Approved Gaps as Comment"}
        </button>
      </div>

      {notice && <p style={{ color: "#166534", marginBottom: 0 }}>{notice}</p>}
      {error && <p style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>}
    </section>
  );
}
