import { request, ApiError } from "../api.js";
import { showAlert, showApiError } from "../ui.js";

const labels = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  password: "Password",
  birthDate: "Birth date",
};

const form = document.getElementById("registerForm");
const alertBox = document.getElementById("alertBox");
const pass1 = form.elements["password"];
const pass2Input = form.elements["password2"];
const pass2Wrap = document.getElementById("pass2");
const btnSubmit = document.getElementById("btnSubmit");

syncPass2Visibility();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.innerHTML = "";

  if (pass1.value) {
    setPass2Visible(true);

    if (!pass2Input.value) {
      showAlert(alertBox, "warning", "Please repeat your password");
      pass2Input.classList.add("is-invalid");
      pass2Input.focus();
      return;
    }

    if (pass1.value !== pass2Input.value) {
      showAlert(alertBox, "warning", "Passwords do not match");
      pass1.classList.add("is-invalid");
      pass2Input.classList.add("is-invalid");
      pass2Input.focus();
      return;
    }
  }

  const fd = new FormData(form);

  const payload = {
    firstName: fd.get("firstName")?.trim(),
    lastName: fd.get("lastName")?.trim(),
    email: fd.get("email")?.trim(),
    password: fd.get("password"),
    birthDate: fd.get("birthDate"),
  };

  try {
    btnSubmit.disabled = true;

    await request("/api/sign-up", {
      method: "POST",
      body: payload,
    });
    sessionStorage.setItem(
      "flash",
      "Registration was successful. Please, sign in"
    );
    window.location.href = "index.html";
  } catch (err) {
    showApiError(err, alertBox, {
      fallback: "Error during registration",
      labels,
    });
  } finally {
    btnSubmit.disabled = false;
  }
});

pass1.addEventListener("input", () => {
  syncPass2Visibility();
  pass1.classList.remove("is-invalid");
  pass2Input.classList.remove("is-invalid");
});

pass2Input.addEventListener("input", () => {
  pass2Input.classList.remove("is-invalid");
});

function syncPass2Visibility() {
  setPass2Visible(Boolean(pass1.value));
}

function setPass2Visible(visible) {
  pass2Wrap.classList.toggle("d-none", !visible);
  pass2Input.required = visible;

  if (!visible) {
    // очищаем confirm при скрытии
    pass2Input.value = "";
    pass2Input.classList.remove("is-invalid");
  }
}
