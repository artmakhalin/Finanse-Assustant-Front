import { login } from "../api.js";
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
    await login(payload);
    window.location.href = "accounts.html";
  } catch (err) {
    showAlert(alertBox, "danger", err.message || "Login error");
  }
});
