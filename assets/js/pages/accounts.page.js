import { requireAuth } from "../auth.js";
import { request, ApiError } from "../api.js";
import { showAlert } from "../ui.js";

await requireAuth();

const alertBox = document.getElementById("alertBox");

try {
  const data = await request("/api/get-user-info");

  console.log(data);

  const p = document.createElement("p");
  p.textContent = `Welcome ${data.email}!`;
  document.body.appendChild(p);
} catch (err) {
if (err instanceof ApiError) {
      showAlert(alertBox, "danger", err.body?.message || "Ошибка входа");
    } else {
      showAlert(alertBox, "danger", "Неизвестная ошибка");
    }
}
