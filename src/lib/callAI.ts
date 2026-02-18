const AI_API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_AI_API_URL) ||
  "http://localhost:5001";

/**
 * Centralized AI API helper
 * All AI requests flow through the Express backend at /api/ai/*
 */
export async function callAI(endpoint: string, payload: unknown): Promise<any> {
  const url = `${AI_API_BASE}/api/ai/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: "AI request failed" }));
    throw new Error(errorBody.error || `AI request failed with status ${res.status}`);
  }

  return res.json();
}

/** Agriculture chat: sends message and returns { success, reply } */
export async function callAgriChat(userMessage: string): Promise<{ success: boolean; reply: string }> {
  const res = await fetch(`${AI_API_BASE}/api/ai/agri-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: "AI request failed" }));
    throw new Error(errorBody.error || `AI request failed with status ${res.status}`);
  }

  return res.json();
}
