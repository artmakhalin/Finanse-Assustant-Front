import { requireAuth, logout } from "../auth.js";
import { request } from "../api.js";
import { showAlert, showApiError } from "../ui.js";
import { API_ACCOUNTS } from "../config.js";
import { API_CATEGORIES } from "../config.js";

const fieldLabels = {
  accountName: "Account title",
  balance: "Balance",
  description: "Category description",
};

const typeLabels = {
  INCOME: "income",
  EXPENSE: "expenses",
};

//Guard
await requireAuth();

//DOM
const btnLogout = document.getElementById("btnLogout");
const addAccountForm = document.getElementById("createAccountForm");
const addCategoryForm = document.getElementById("createCategoryForm");
const categoryOpeners = document.querySelectorAll("[data-opener-id]");
const editAccountForm = document.getElementById("editAccountForm");
const alertBox = document.getElementById("alertBox");
const alertBoxModalCreateAccount = document.getElementById(
  "alertBoxModalCreateAccount"
);
const alertBoxModalCreateCategory = document.getElementById(
  "alertBoxModalCreateCategory"
);
const alertBoxModalEditAccount = document.getElementById(
  "alertBoxModalEditAccount"
);
const accountsDiv = document.getElementById("accountsDiv");
const incomeDiv = document.getElementById("incomeDiv");
const expensesDiv = document.getElementById("expensesDiv");
const addAccountModal = document.getElementById("addAccountModal");
const editAccountModal = document.getElementById("editAccountModal");
const addCategoryModal = document.getElementById("addCategoryModal");

//State
let accountsCache = [];
const categoriesByType = {
  INCOME: [],
  EXPENSE: [],
  TRANSFER: [],
};
let editingAccountId = null;
let currentCategoryType = null;

//Start Page
await startPage();

async function startPage() {
  bindEvents();
  await Promise.all([loadAccounts(), loadCategories()]);
}

//Events
function bindEvents() {
  btnLogout.addEventListener("click", async () => await logout());

  addAccountForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBoxModalCreateAccount.innerHTML = "";

    const fd = new FormData(addAccountForm);

    const correctBalance = validateBalance(
      fd,
      "balance",
      alertBoxModalCreateAccount
    );
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
      showApiError(err, alertBoxModalCreateAccount, {
        fallback: "Error when creating account",
        fieldLabels,
      });
    }
  });

  for (const btn of categoryOpeners) {
    btn.addEventListener("click", () => {
      currentCategoryType = btn.dataset.openerId;
    });
  }

  addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBoxModalCreateCategory.innerHTML = "";

    if (!currentCategoryType) {
      showAlert(
        alertBoxModalCreateCategory,
        "danger",
        "Choose category type first"
      );
      return;
    }

    const fd = new FormData(addCategoryForm);

    const payload = {
      description: fd.get("description")?.trim(),
      type: currentCategoryType,
    };

    try {
      const data = await request(`${API_CATEGORIES}`, {
        method: "POST",
        body: payload,
      });

      if (data) {
        categoriesByType[currentCategoryType].push(data);
        renderCategories(
          categoriesByType[currentCategoryType],
          currentCategoryType
        );

        showAlert(alertBox, "success", "Category created");
        addCategoryForm.reset();
        hideModal(addCategoryModal);
      }
    } catch (err) {
      showApiError(err, alertBoxModalCreateCategory, {
        fallback: "Error when creating category",
        fieldLabels,
      });
    }
  });

  addCategoryModal.addEventListener("hidden.bs.modal", () => {
    currentCategoryType = null;
    addCategoryForm.reset();
    alertBoxModalCreateCategory.innerHTML = "";
  });

  accountsDiv.addEventListener("click", (e) => {
    const editBtn = e.target.closest("button.account-edit");
    const deleteBtn = e.target.closest("button.account-delete");

    if (deleteBtn) {
      return deleteAccount(deleteBtn.dataset.id);
    }

    if (editBtn) {
      alertBoxModalEditAccount.innerHTML = "";
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
      fieldLabels,
    });
  }
}

async function loadCategories() {
  try {
    const types = ["INCOME", "EXPENSE"];
    const results = await Promise.all(
      types.map((t) => request(`${API_CATEGORIES}?type=${t}`))
    );

    types.forEach((t, i) => {
      categoriesByType[t] = results[i].list;
      renderCategories(categoriesByType[t], t);
    });
  } catch (err) {
    showApiError(err, alertBox, {
      fallback: "Error when loading categories",
      fieldLabels,
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
      fieldLabels,
    });
  }
}

async function updateAccount(currentAccount) {
  try {
    const id = currentAccount.accountId;
    const fd = new FormData(editAccountForm);

    const correctBalance = validateBalance(
      fd,
      "newBalance",
      alertBoxModalEditAccount
    );
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
    showApiError(err, alertBoxModalEditAccount, {
      fallback: "Error when updating account",
      fieldLabels,
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

function renderCategories(categories, type) {
  const container = getContainerByType(type);
  container.innerHTML = "";

  if (categories.length == 0) {
    const msgNoCategories = document.createElement("p");
    msgNoCategories.textContent = `You don't have any ${typeLabels[type]}`;
    container.appendChild(msgNoCategories);
  } else {
    for (const category of categories) {
      renderCategoryCard(container, category);
    }
  }
}

function renderAccountCard(account) {
  const wrapper = document.createElement("div");
  wrapper.className = "col";
  wrapper.dataset.id = account.accountId;
  accountsDiv.appendChild(wrapper);

  const card = document.createElement("div");
  card.className = "card h-100";
  wrapper.appendChild(card);

  const cardBody = document.createElement("div");
  cardBody.className = "card-body d-flex flex-column";
  card.appendChild(cardBody);

  const head = document.createElement("div");
  head.className = "d-flex align-items-start justify-content-between gap-2";
  cardBody.appendChild(head);

  const cardTitle = document.createElement("h5");
  cardTitle.className = "card-title mb-0 text-truncate";
  cardTitle.textContent = account.accountName;
  head.appendChild(cardTitle);

  const cardText = document.createElement("p");
  cardText.className = "card-text mt-2 mb-3 fw-semibold fs-5";
  cardText.textContent = account.balance;
  cardBody.appendChild(cardText);

  const actions = document.createElement("div");
  actions.className = "d-flex gap-2 flex-shrink-0";
  head.appendChild(actions);

  const btnRemove = document.createElement("button");
  btnRemove.className =
    "btn btn-outline-danger btn-sm rounded-3 action-btn account-delete";
  btnRemove.dataset.id = account.accountId;
  btnRemove.textContent = "X";
  actions.appendChild(btnRemove);

  const btnEdit = document.createElement("button");
  btnEdit.className =
    "btn btn-outline-secondary btn-sm rounded-3 action-btn account-edit";
  btnEdit.dataset.id = account.accountId;
  btnEdit.setAttribute("data-bs-toggle", "modal");
  btnEdit.setAttribute("data-bs-target", "#editAccountModal");
  btnEdit.textContent = "...";
  actions.appendChild(btnEdit);
}

function renderCategoryCard(container, category) {
  const wrapper = document.createElement("div");
  wrapper.className = "col";
  wrapper.dataset.id = category.categoryId;
  container.appendChild(wrapper);

  const card = document.createElement("div");
  card.className = "card h-100";
  wrapper.appendChild(card);

  const cardBody = document.createElement("div");
  cardBody.className = "card-body py-3 d-flex flex-column";
  card.appendChild(cardBody);

  const head = document.createElement("div");
  head.className = "d-flex align-items-start justify-content-between gap-2";
  cardBody.appendChild(head);

  const cardTitle = document.createElement("h5");
  cardTitle.className = "card-title mb-0 text-truncate-2";
  cardTitle.textContent = category.description;
  head.appendChild(cardTitle);

  const actions = document.createElement("div");
  actions.className = "d-flex gap-2 flex-shrink-0";
  head.appendChild(actions);

  const btnRemove = document.createElement("button");
  btnRemove.className =
    "btn btn-outline-danger btn-sm rounded-3 action-btn category-delete";
  btnRemove.dataset.id = category.categoryId;
  btnRemove.textContent = "X";
  actions.appendChild(btnRemove);

  const btnEdit = document.createElement("button");
  btnEdit.className =
    "btn btn-outline-secondary btn-sm rounded-3 action-btn category-edit";
  btnEdit.dataset.id = category.categoryId;
  // btnEdit.setAttribute("data-bs-toggle", "modal");
  // btnEdit.setAttribute("data-bs-target", "#editCategoryModal");
  btnEdit.textContent = "...";
  actions.appendChild(btnEdit);
}

//helper
function hideModal(modal) {
  const thisModal = bootstrap.Modal.getOrCreateInstance(modal);
  thisModal.hide();
}

function validateBalance(formData, fieldName, box) {
  const balance = Number(formData.get(fieldName));
  if (!Number.isFinite(balance) || balance < 0) {
    showAlert(box, "danger", "Invalid balance");
    return null;
  }
  return balance;
}

function getContainerByType(type) {
  switch (type) {
    case "INCOME":
      return incomeDiv;
    case "EXPENSE":
      return expensesDiv;
    default:
      throw new Error(`Unsupported category type: ${type}`);
  }
}
