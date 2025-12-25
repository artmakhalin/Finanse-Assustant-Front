import { request, ApiError } from "../api.js";
import { showAlert, escapeHtml } from "../ui.js";

const labels = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  password: "Password",
  birthDate: "Birth date",
};

const form = document.getElementById("registerForm");
const alertBox = document.getElementById("alertBox");
const pass1 = document.getElementsByName("password")[0];
const pass2Input = document.getElementsByName("password2")[0];
const pass2 = document.getElementById("pass2");
const btnSubmit = document.getElementById("btnSubmit");

pass2.style.display = "none";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.innerHTML = "";

  if (pass1.value !== pass2Input.value) {
    pass2.style.display = "block";
    showAlert(alertBox, "warning", "Passwords do not match");
    pass1.classList.add("is-invalid");
    pass2Input.classList.add("is-invalid");

    return;
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
    window.location.href = "login.html";
  } catch (err) {
    if (err instanceof ApiError) {
      let msg = "";
      if (err.body.errors) {
        const html = `
        <div class="fw-semibold mb-1">Please fix:</div>
        <ul class="mb-0">
            ${err.body.errors
            .map(
                (e) =>
                `<li><b>${labels[e.field] ?? e.field}</b>: ${escapeHtml(
                    e.message
                )}</li>`
            )
            .join("")}
        </ul>
        `;

        showAlert(alertBox, "danger", html, { asHtml: true });
      } else {
        showAlert(
          alertBox,
          "danger",
          err.body?.message || "Error during registration"
        );
      }
    } else {
      showAlert(alertBox, "danger", "Unknown error");
    }
  } finally {
    btnSubmit.disabled = false;
  }
});

pass1.addEventListener("input", () => {
  pass2.style.display = pass1.value ? "block" : "none";
  pass1.classList.remove("is-invalid");
});

pass2Input.addEventListener("input", () => {
  pass2Input.classList.remove("is-invalid");
});
