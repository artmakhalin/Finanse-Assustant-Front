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
