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
 */
export async function analyseTodos(todos, authHeader) {
  const res = await fetch(`${CONFIG.API_BASE}/main/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(todos),
  });

  if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
  const raw = await res.text();
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

/**
 * Runs a single specialist agent.
 */
export async function runAgent(type, todoRef, authHeader) {
  const res = await fetch(`${CONFIG.API_BASE}/main/run-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ type, todoRef }),
  });

  if (!res.ok) throw new Error(`Agent execution failed (${res.status})`);
  return res.text();
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

/**
 * Fetches the list of patients from the backend.
 */
export async function fetchPatients(authHeader) {
  const res = await fetch(`${CONFIG.API_BASE}/main/patients`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch patients (${res.status})`);
  }
  return res.json();
}

/**
 * Saves a consultation record to the backend.
 */
export async function saveConsultation(payload, authHeader) {
  const res = await fetch(`${CONFIG.API_BASE}/main/save-consultation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to save consultation (${res.status})`);
  }
  return res.json();
}
