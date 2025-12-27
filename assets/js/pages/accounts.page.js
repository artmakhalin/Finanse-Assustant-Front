import { requireAuth } from "../auth.js";
import { request, ApiError } from "../api.js";
import { showAlert, showApiError } from "../ui.js";
import { API_ACCOUNTS } from "../config.js";

const labels = {
  accountName: "Account title",
  balance: "Balance",
};

//Guard
await requireAuth();

//DOM
const addAccountForm = document.getElementById("createAccountForm");
const editAccountForm = document.getElementById("editAccountForm");
const alertBox = document.getElementById("alertBox");
const alertBoxModalCreate = document.getElementById("alertBoxModalCreate");
const alertBoxModalEdit = document.getElementById("alertBoxModalEdit");
const accountsDiv = document.getElementById("accountsDiv");
const addAccountModal = document.getElementById("addAccountModal");
const editAccountModal = document.getElementById("editAccountModal");

//State
let accountsCache = [];
let editingAccountId = null;

//Init
init();

function init() {
  loadAccounts();
  bindEvents();
}

//Events
function bindEvents() {
  addAccountForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBoxModalCreate.innerHTML = "";

    const fd = new FormData(addAccountForm);

    const correctBalance = validateBalance(fd, alertBoxModalCreate);
    if (correctBalance === null) return;

    const payload = {
      accountName: fd.get("accountName")?.trim(),
      balance: correctBalance,
    };

    try {
      const data = await request(`${API_ACCOUNTS}`, {
        method: "POST",
        body: payload,
      });

      if (data) {
        accountsCache.push(data);
        renderAccounts(accountsCache);

        showAlert(alertBox, "success", "Account created");
        addAccountForm.reset();
        hideModal(addAccountModal);
      }
    } catch (err) {
      showApiError(err, alertBoxModalCreate, {
        fallback: "Error when creating account",
        labels,
      });
    }
  });

  accountsDiv.addEventListener("click", (e) => {
    const editBtn = e.target.closest("button.account-edit");
    const deleteBtn = e.target.closest("button.account-delete");

    if (deleteBtn) {
      return deleteAccount(deleteBtn.dataset.id);
    }

    if (editBtn) {
      alertBoxModalEdit.innerHTML = "";
      const id = editBtn.dataset.id;

      const currentAccount = accountsCache.find((acc) => acc.accountId == id);
      editingAccountId = id;

      const newNameInput = document.getElementById("newAccountName");
      const newBalanceInput = document.getElementById("newBalance");

      newNameInput.value = currentAccount.accountName;
      newBalanceInput.value = currentAccount.balance;
    }
  });

  editAccountForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editingAccountId) return;
    const currentAccount = accountsCache.find(
      (acc) => acc.accountId == editingAccountId
    );

    await updateAccount(currentAccount);
  });
}

//Business logic
async function loadAccounts() {
  try {
    const data = await request(`${API_ACCOUNTS}`);
    accountsCache = data.list;
    renderAccounts(accountsCache);
  } catch (err) {
    showApiError(err, alertBox, {
      fallback: "Error when loading account",
      labels,
    });
  }
}

async function deleteAccount(id) {
  try {
    await request(`${API_ACCOUNTS}/${id}`, { method: "DELETE" });
    showAlert(alertBox, "success", "Account removed");
    accountsCache = accountsCache.filter((acc) => acc.accountId != id);

    renderAccounts(accountsCache);
  } catch (err) {
    showApiError(err, alertBox, {
      fallback: "Error when deleting account",
      labels,
    });
  }
}

async function updateAccount(currentAccount) {
  try {
    const id = currentAccount.accountId;
    const fd = new FormData(editAccountForm);

    const correctBalance = validateBalance(fd, alertBoxModalEdit);
    if (correctBalance === null) return;

    const payload = {
      accountName: fd.get("newAccountName")?.trim(),
      balance: correctBalance,
      creationDate: currentAccount.creationDate,
    };

    const updatedAccount = await request(`${API_ACCOUNTS}/${id}`, {
      method: "PUT",
      body: payload,
    });

    accountsCache = accountsCache.map((acc) =>
      acc.accountId == id ? updatedAccount : acc
    );
    renderAccounts(accountsCache);

    showAlert(alertBox, "success", "Account updated");
    editAccountForm.reset();
    hideModal(editAccountModal);
  } catch (err) {
    showApiError(err, alertBoxModalEdit, {
      fallback: "Error when updating account",
      labels,
    });
  }
}

//Render
function renderAccounts(accounts) {
  accountsDiv.innerHTML = "";

  if (accounts.length == 0) {
    const msgNoAccounts = document.createElement("p");
    msgNoAccounts.textContent = "You don't have any accounts";
    accountsDiv.appendChild(msgNoAccounts);
  } else {
    for (const account of accounts) {
      renderAccountCard(account);
    }
  }
}

function renderAccountCard(account) {
  const container = document.createElement("div");
  container.classList.add("col-md-auto");
  container.dataset.id = account.accountId;
  accountsDiv.appendChild(container);

  const card = document.createElement("div");
  card.classList.add("card");
  container.appendChild(card);

  const cardBody = document.createElement("div");
  cardBody.classList.add("card-body");
  card.appendChild(cardBody);

  const cardTitle = document.createElement("h5");
  cardTitle.classList.add("card-title");
  cardTitle.textContent = account.accountName;
  cardBody.appendChild(cardTitle);

  const cardText = document.createElement("p");
  cardText.classList.add("card-text");
  cardText.textContent = account.balance;
  cardBody.appendChild(cardText);

  const btnRemove = document.createElement("button");
  btnRemove.classList.add("btn");
  btnRemove.classList.add("btn-danger");
  btnRemove.classList.add("account-delete");
  btnRemove.dataset.id = account.accountId;
  btnRemove.textContent = "X";
  cardBody.appendChild(btnRemove);

  const btnEdit = document.createElement("button");
  btnEdit.classList.add("btn");
  btnEdit.classList.add("btn-secondary");
  btnEdit.classList.add("account-edit");
  btnEdit.dataset.id = account.accountId;
  btnEdit.setAttribute("data-bs-toggle", "modal");
  btnEdit.setAttribute("data-bs-target", "#editAccountModal");
  btnEdit.textContent = "...";
  cardBody.appendChild(btnEdit);
}

//helper
function hideModal(modal) {
  const thisModal = bootstrap.Modal.getOrCreateInstance(modal);
  thisModal.hide();
}

function validateBalance(formData, box) {
  const balance = Number(formData.get("balance"));
  if (!Number.isFinite(balance) || balance < 0) {
    showAlert(box, "danger", "Invalid balance");
    return null;
  }
  return balance;
}
