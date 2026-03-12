// ── Configuration ─────────────────────────────────────────────────────────
export const CONFIG = {
  // Go Gateway  (router.go: r.Run(":8081"))
  API_BASE: import.meta.env.VITE_API_BASE || "http://localhost:8081",
  WS_BASE:  import.meta.env.VITE_WS_BASE  || "ws://localhost:8081",

  // Anthropic (set VITE_ANTHROPIC_KEY in .env.local)
  ANTHROPIC_KEY:   import.meta.env.VITE_ANTHROPIC_KEY || "",
  ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
};

// ── Doctor Auth API ────────────────────────────────────────────────────────

/**
 * POST /doctor/login
 * Body: { name, password }
 * Returns: { message, doctor: DoctorModel, token: string }
 */
export async function doctorLogin(name, password) {
  const res = await fetch(`${CONFIG.API_BASE}/doctor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `登入失敗 (${res.status})`);
  }
  return res.json(); // { message, doctor, token }
}

/**
 * POST /doctor/register
 * Body: DoctorModel fields
 */
export async function doctorRegister(payload) {
  const res = await fetch(`${CONFIG.API_BASE}/doctor/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `註冊失敗 (${res.status})`);
  }
  return res.json();
}

// ── Authenticated fetch helper ─────────────────────────────────────────────

/**
 * Wrapper around fetch that injects Authorization header.
 * @param {string} url
 * @param {object} options - standard fetch options
 * @param {function} authHeader - from useAuth().authHeader
 */
export async function authFetch(url, options = {}, authHeader = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Anthropic API — AI Multi-Agent ────────────────────────────────────────

/**
 * Analyses todo items and routes them to specialist agents.
 *
 * TodoItem shape (from agent/model/model.go):
 *   { ID, Type, Priority, Detail }
 *
 * Returns: Array<{ type, label, todoRef, priority }>
 */
export async function analyseTodos(todos) {
  const formatted = todos
    .map((t, i) => `${i + 1}. [Priority:${t.Priority}][Type:${t.Type}] ${t.Detail}`)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CONFIG.ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: `You are a medical workflow router.
Given a list of doctor's TODO items (with Priority 1=highest and Type hints), assign each to the most appropriate specialist agent.
Available agent types:
- "summarize"  : Summarise patient notes or lab results
- "diagnose"   : Differential diagnosis assistance
- "schedule"   : Appointment or follow-up scheduling
- "followup"   : Patient follow-up action items

Respect the Priority field — higher priority tasks should be flagged.
Respond ONLY with a JSON array, no markdown, no explanation.
Each element: { "type": string, "label": string, "todoRef": string, "priority": number }
"label" is a short human-readable task title (≤8 words).
"todoRef" is the original Detail text verbatim.`,
      messages: [{ role: "user", content: `TODOs:\n${formatted}` }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  const raw = data.content?.[0]?.text || "[]";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

/**
 * Runs a single specialist agent.
 * Returns a markdown string.
 */
export async function runAgent(type, todoRef) {
  const prompts = {
    summarize: `Summarise the following medical note in 3–4 concise bullet points for the attending physician.`,
    diagnose:  `Provide a brief differential diagnosis (top 3) and suggested next steps based on this clinical note.`,
    schedule:  `Draft a scheduling action plan with suggested timeframes for the following task.`,
    followup:  `List concrete follow-up action items with priority levels (High/Medium/Low) for the following task.`,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CONFIG.ANTHROPIC_MODEL,
      max_tokens: 800,
      system: `You are a specialist medical AI agent. Be concise and clinically precise. Use plain markdown.`,
      messages: [
        {
          role: "user",
          content: `${prompts[type] || prompts.followup}\n\nTask: ${todoRef}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

/**
 * Calls the Go backend to synthesize a SOAP note from transcripts.
 * @param {string[]} transcripts 
 * @param {function} authHeader 
 */
export async function synthesizeSOAP(transcripts, authHeader) {
  console.log("🚀 Starting SOAP synthesis with", transcripts.length, "transcript segments");
  const res = await fetch(`${CONFIG.API_BASE}/main/synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ transcripts }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("❌ SOAP synthesis failed:", res.status, err);
    throw new Error(err.error || `Synthesis failed (${res.status})`);
  }
  const data = await res.json();
  console.log("✅ SOAP synthesis completed successfully");
  return data; // { soap_note }
}

/**
 * Calls the Go backend's Eino Orchestrator to process all pending TODOs.
 * @param {function} authHeader 
 */
export async function processTodos(authHeader) {
  const res = await fetch(`${CONFIG.API_BASE}/main/process-todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Backend orchestration failed (${res.status})`);
  }
  return res.json(); // { items: TodoItem[], results: string[] }
}
