import { request } from "./api.js";

export async function requireAuth() {
  try {
    await request("/api/get-user-info"); 
  } catch (e) {
    window.location.href = "login.html";
  }
}

export async function logout() {
  // если есть endpoint logout:
  // await request("/logout", { method: "POST" });
  window.location.href = "login.html";
}
