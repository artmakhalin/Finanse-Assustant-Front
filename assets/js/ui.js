import { ApiError } from "./api.js";

export function showAlert(container, type, message, { asHtml = false } = {}) {
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <div class="alert-message"></div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  const msgEl = container.querySelector(".alert-message");
  if (asHtml) {
    msgEl.innerHTML = message;        // интерпретирует <br/>, <ul>, ...
  } else {
    msgEl.textContent = message;      // безопасно, без HTML
  }
}

export function escapeHtml(str = "") {
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m])
  );
}

export function showApiError(err, box, { fallback = "Unknown error", labels = {} } = {}) {
  if (!(err instanceof ApiError)) {
    showAlert(box, "danger", fallback);
    return;
  }

  const body = err.body;
  const hasFieldErrors =
    body &&
    typeof body === "object" &&
    Array.isArray(body.errors) &&
    body.errors.length > 0;

  if (hasFieldErrors) {
    const html = `
      <div class="fw-semibold mb-1">Please fix:</div>
      <ul class="mb-0">
        ${body.errors
          .map(
            (e) =>
              `<li><b>${escapeHtml(labels[e.field] ?? e.field)}</b>: ${escapeHtml(e.message)}</li>`
          )
          .join("")}
      </ul>
    `;
    showAlert(box, "danger", html, { asHtml: true });
    return;
  }

  showAlert(box, "danger", err.message || fallback);
}
