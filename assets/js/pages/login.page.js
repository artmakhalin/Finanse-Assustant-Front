import { login, ApiError } from "../api.js";
import { showAlert } from "../ui.js";

const form = document.getElementById("loginForm");
const alertBox = document.getElementById("alertBox");
const flash = sessionStorage.getItem("flash");

if (flash) {
  sessionStorage.removeItem("flash");
  showAlert(alertBox, "success", flash);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.innerHTML = "";

  const fd = new FormData(form);
  const payload = {
    email: fd.get("email")?.trim(),
    password: fd.get("password"),
  };

  try {
    const ok = await login(payload);

    // после логина — на accounts
    if (ok) {
      window.location.href = "accounts.html";
    } else {
      showAlert(alertBox, "danger", "Incorrect email or password");
    }
  } catch (err) {
    if (err instanceof ApiError) {
      showAlert(alertBox, "danger", err.body?.message || "Ошибка входа");
    } else {
      showAlert(alertBox, "danger", "Неизвестная ошибка");
    }
  }
});
