/**
 * Centralized AI API helper
 * All AI requests flow through the Express backend at /api/ai/*
 */
export async function callAI(endpoint: string, payload: unknown): Promise<any> {
  const res = await fetch(`/api/ai/${endpoint}`, {
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
