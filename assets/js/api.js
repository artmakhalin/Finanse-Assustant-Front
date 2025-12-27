import { API_BASE } from "./config.js";

export class ApiError extends Error {
  constructor(status, body) {
    const message =
      body && typeof body === "object" && body.message
        ? body.message
        : typeof body === "string" && body.trim()
        ? body
        : `HTTP ${status}`;

    super(message);
    this.status = status;
    this.body = body;
  }
}

async function readBody(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) return await res.json();
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

export async function request(
  path,
  { method = "GET", body, headers, rawBody } = {}
) {
  const hasJsonBody = body !== undefined && body !== null;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: rawBody ?? (hasJsonBody ? JSON.stringify(body) : undefined),
    credentials: "include",
  });

  const data = await readBody(res);

  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export async function login({ email, password }) {
  const form = new URLSearchParams({ email, password });

  await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    rawBody: form,
  });

  return true;
}
