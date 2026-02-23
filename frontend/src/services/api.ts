export interface Gap {
  id: string;
  text: string;
  status: "pending" | "approved" | "rejected";
}

export interface SuggestedTestCase {
  id: string;
  title: string;
  steps: string[];
  similarityScore: number;
  linked?: boolean;
}

export interface RepoTestCase {
  id: string;
  title: string;
  steps: string[];
  similarityScore: number;
  link?: string;
  linked?: boolean;
}

const requestJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const getGaps = async (storyId: string): Promise<Gap[]> => {
  return requestJson<Gap[]>(`/api/stories/${storyId}/gaps`);
};

export const postApprovedGaps = async (storyId: string, gaps: Gap[]): Promise<void> => {
  await requestJson<void>(`/api/stories/${storyId}/gaps`, {
    method: "POST",
    body: JSON.stringify({ gaps }),
  });
};

export const getSuggestedTestCases = async (storyId: string): Promise<SuggestedTestCase[]> => {
  return requestJson<SuggestedTestCase[]>(`/api/stories/${storyId}/testcases?suggested=true`);
};

export const getTestRepo = async (): Promise<RepoTestCase[]> => {
  return requestJson<RepoTestCase[]>("/api/test-repo");
};

export const postTestCaseLink = async (storyId: string, testCaseId: string): Promise<void> => {
  await requestJson<void>(`/api/stories/${storyId}/testcases`, {
    method: "POST",
    body: JSON.stringify({ testCaseId }),
  });
};
