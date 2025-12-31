import { requireAuth, logout } from "../auth.js";
import { request } from "../api.js";
import { showAlert, showApiError } from "../ui.js";
import { API_REPORT } from "../config.js";

const fieldLabels = {
  till: "End date",
  from: "Start date",
  type: "Transaction type",
};

const reportFrom = document.getElementById("reportFrom");
const reportDiv = document.getElementById("reportDiv");
const alertBox = document.getElementById("alertBox");

const btnLogout = document.getElementById("btnLogout");

await requireAuth();

btnLogout.addEventListener("click", onLogoutClick);

reportFrom.addEventListener("submit", onReportSubmit);

async function onLogoutClick() {
  await logout();
}

async function onReportSubmit(e) {
  e.preventDefault();
  const fd = new FormData(reportFrom);
  const from = fd.get("startDate");
  const till = fd.get("endDate");

  if (from && till && from > till) {
    showAlert(alertBox, "danger", "End date should be after start date");
    reportDiv.innerHTML = "";
    return;
  }

  const payload = {
    from: fd.get("startDate"),
    till: fd.get("endDate"),
    type: fd.get("selectCategory"),
  };

  try {
    const data = await request(`${API_REPORT}`, {
      method: "POST",
      body: payload,
    });

    if (data.list.length > 0) {
      renderReport(payload, data.list);
    } else {
      showAlert(alertBox, "warning", "No transactions found");
      reportDiv.innerHTML = "";
    }
    reportFrom.reset();
  } catch (err) {
    showApiError(err, alertBox, {
      fallback: "Error when loading report",
      fieldLabels,
    });
  }
}

function renderReport(payload, data) {
  reportDiv.innerHTML = "";
  const header = document.createElement("h5");
  header.textContent = `${payload.type} (${payload.from} - ${payload.till})`;
  reportDiv.appendChild(header);

  const list = document.createElement("ul");
  list.className = "list-group mb-3";
  reportDiv.appendChild(list);

  data.forEach((repItem) => {
    const item = document.createElement("li");
    item.className = "list-group-item";
    item.textContent = `${repItem.description} - ${repItem.sum}`;
    list.appendChild(item);
  });

  const btnClear = document.createElement("button");
  btnClear.className = "btn btn-primary w-100";
  btnClear.textContent = "Clear";
  btnClear.addEventListener("click", clearReportContainer);
  reportDiv.appendChild(btnClear);
}

function clearReportContainer() {
  reportDiv.innerHTML = "";
}
