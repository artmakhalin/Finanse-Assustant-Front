import { request, ApiError } from "./api.js";

export async function requireAuth() {
  try {
    await request("/api/get-user-info");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      window.location.href = "login.html";
      return;
    }
    console.error(e);
  }
}

export async function logout() {
  // если есть endpoint logout:
  // await request("/logout", { method: "POST" });
  window.location.href = "login.html";
}
