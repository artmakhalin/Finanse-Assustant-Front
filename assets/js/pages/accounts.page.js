import { requireAuth, logout } from "../auth.js";
import { request } from "../api.js";
import { showAlert, showApiError } from "../ui.js";
import { API_ACCOUNTS } from "../config.js";
import { API_CATEGORIES } from "../config.js";

//Const / Labels
const fieldLabels = {
  accountName: "Account title",
  balance: "Balance",
  description: "Category description",
};

const typeLabels = {
  INCOME: "income",
  EXPENSE: "expenses",
};

const CATEGORY_TYPES = ["INCOME", "EXPENSE"];

//DOM
const btnLogout = document.getElementById("btnLogout");

const addAccountForm = document.getElementById("createAccountForm");
const addCategoryForm = document.getElementById("createCategoryForm");
const editAccountForm = document.getElementById("editAccountForm");
const editCategoryForm = document.getElementById("editCategoryForm");

const categoryOpeners = document.querySelectorAll("[data-opener-id]");

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
const alertBoxModalEditCategory = document.getElementById(
  "alertBoxModalEditCategory"
);

const accountsDiv = document.getElementById("accountsDiv");
const incomeDiv = document.getElementById("incomeDiv");
const expensesDiv = document.getElementById("expensesDiv");

const addAccountModal = document.getElementById("addAccountModal");
const editAccountModal = document.getElementById("editAccountModal");
const addCategoryModal = document.getElementById("addCategoryModal");
const editCategoryModal = document.getElementById("editCategoryModal");

//State
let accountsCache = [];
const categoriesByType = {
  INCOME: [],
  EXPENSE: [],
  TRANSFER: [],
};
let editingAccountId = null;
let editingCategoryId = null;
let currentCategoryType = null;

//Start Page
await requireAuth();
await startPage();

async function startPage() {
  bindEvents();
  await Promise.all([loadAccounts(), loadCategories()]);
}

//Events
function bindEvents() {
  btnLogout.addEventListener("click", onLogoutClick);

  addAccountForm.addEventListener("submit", onCreateAccountSubmit);
  editAccountForm.addEventListener("submit", onEditAccountSubmit);
  addCategoryForm.addEventListener("submit", onCreateCategorySubmit);
  editCategoryForm.addEventListener("submit", onEditCategorySubmit);

  for (const btn of categoryOpeners) {
    btn.addEventListener("click", onCategoryOpenerClick);
  }

  addCategoryModal.addEventListener("hidden.bs.modal", onCategoryModalHidden);

  accountsDiv.addEventListener("click", onAccountsClick);

  // на будущее (когда добавишь edit/delete категорий)
  incomeDiv.addEventListener("click", onCategoriesClick);
  expensesDiv.addEventListener("click", onCategoriesClick);

  async function onLogoutClick() {
    await logout();
  }

  async function onCreateAccountSubmit(e) {
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
  }

  async function onEditAccountSubmit(e) {
    e.preventDefault();
    if (!editingAccountId) return;
    const currentAccount = accountsCache.find(
      (acc) => acc.accountId == editingAccountId
    );

    await updateAccount(currentAccount);
  }

  async function onCreateCategorySubmit(e) {
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
  }

  async function onEditCategorySubmit(e) {
    e.preventDefault;
    if (!editingCategoryId || !currentCategoryType) return;
    const currentCategory = categoriesByType[currentCategoryType].find(
      (cat) => cat.categoryId == editingCategoryId
    );

    await updateCategory(currentCategory);
  }

  function onCategoryOpenerClick(e) {
    currentCategoryType = e.currentTarget.dataset.openerId;
  }

  function onCategoryModalHidden() {
    currentCategoryType = null;
    addCategoryForm.reset();
    alertBoxModalCreateCategory.innerHTML = "";
  }

  function onAccountsClick(e) {
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
  }

  function onCategoriesClick(e) {
    currentCategoryType = e.target.dataset.openerId;

    if (!currentCategoryType) {
      showAlert(
        alertBoxModalCreateCategory,
        "danger",
        "Choose category type first"
      );
      return;
    }

    const editBtn = e.target.closest("button.category-edit");
    const deleteBtn = e.target.closest("button.category-delete");

    if (deleteBtn) {
      return deleteCategory(deleteBtn.dataset.id);
    }

    if (editBtn) {
      alertBoxModalEditCategory.innerHTML = "";
      const id = editBtn.dataset.id;

      const currentCategory = categoriesByType[currentCategoryType].find(
        (cat) => cat.categoryId == id
      );
      editingCategoryId = id;

      const newDescriptionInput = document.getElementById("newDescription");
      newDescriptionInput.value = currentCategory.description;
    }
  }
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
    const results = await Promise.all(
      CATEGORY_TYPES.map((t) => request(`${API_CATEGORIES}?type=${t}`))
    );

    CATEGORY_TYPES.forEach((t, i) => {
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

async function deleteCategory(id) {
  try {
    await request(`${API_CATEGORIES}/${id}`, { method: "DELETE" });
    showAlert(alertBox, "success", "Category removed");
    categoriesByType[currentCategoryType] = categoriesByType[
      currentCategoryType
    ].filter((cat) => cat.categoryId != id);

    renderCategories(
      categoriesByType[currentCategoryType],
      currentCategoryType
    );
    currentCategoryType = null;
  } catch (err) {
    showApiError(err, alertBox, {
      fallback: "Error when deleting categories",
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
    editingAccountId = null;
    hideModal(editAccountModal);
  } catch (err) {
    showApiError(err, alertBoxModalEditAccount, {
      fallback: "Error when updating account",
      fieldLabels,
    });
  }
}

async function updateCategory(currentCategory) {
  try {
    const id = currentCategory.categoryId;
    const type = currentCategory.type;
    const fd = new FormData(editCategoryForm);

    //TODO - fix API
    const payLoad = {
      id: id,
      description: fd.get("newDescription")?.trim(),
      type: type,
    };

    const updatedCategory = await request(`${API_CATEGORIES}/${id}`, {
      method: "PUT",
      body: payLoad,
    });

    categoriesByType[type] = categoriesByType[type].map((cat) =>
      cat.categoryId == id ? updatedCategory : cat
    );
    renderCategories(categoriesByType[type], type);

    showAlert(alertBox, "success", "Category updated");
    editCategoryForm.reset();
    editingCategoryId = null;
    currentCategoryType = null;
    hideModal(editCategoryModal);
  } catch (err) {
    showApiError(err, alertBoxModalEditCategory, {
      fallback: "Error when updating category",
      fieldLabels,
    });
  }
}

//Render
function renderAccounts(accounts) {
  renderList(
    accountsDiv,
    accounts,
    (a) =>
      buildCard({
        id: a.accountId,
        title: a.accountName,
        subtitle: a.balance,
        deleteClass: "account-delete",
        editClass: "account-edit",
        editTarget: "#editAccountModal",
        titleClass: "card-title mb-0 text-truncate",
        bodyClass: "card-body d-flex flex-column",
      }),
    "You don't have any accounts"
  );
}

function renderCategories(categories, type) {
  const container = getContainerByType(type);
  container.innerHTML = "";

  renderList(
    container,
    categories,
    (c) =>
      buildCard({
        id: c.categoryId,
        title: c.description,
        deleteClass: "category-delete",
        editClass: "category-edit",
        editTarget: "#editCategoryModal",
        titleClass: "card-title mb-0 text-truncate-2",
        bodyClass: "card-body py-3 d-flex flex-column",
        type: type,
      }),
    `You don't have any ${typeLabels[type]}`
  );
}

function renderList(container, items, renderItem, emptyText) {
  container.innerHTML = "";

  if (!items?.length) {
    container.appendChild(
      el("p", { text: emptyText, className: "text-muted mb-0" })
    );
    return;
  }

  const frag = document.createDocumentFragment();
  for (const item of items) frag.appendChild(renderItem(item));
  container.appendChild(frag);
}

//Helpers
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

//UI Builders
function el(tag, { className, text, attrs, dataset } = {}, children = []) {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (text != null) node.textContent = text;

  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) if (k) node.setAttribute(k, v);
  }

  if (dataset) {
    for (const [k, v] of Object.entries(dataset)) if (k) node.dataset[k] = v;
  }

  for (const child of children) node.appendChild(child);
  return node;
}

function createActions({ id, deleteClass, editClass, editTarget, type } = {}) {
  const actions = el("div", { className: "d-flex gap-2 flex-shrink-0" });

  const btnRemove = el("button", {
    className: `btn btn-outline-danger btn-sm rounded-3 action-btn ${deleteClass}`,
    text: "X",
    dataset: { id: id, openerId: type },
    attrs: { type: "button" },
  });

  const btnEdit = el("button", {
    className: `btn btn-outline-secondary btn-sm rounded-3 action-btn ${editClass}`,
    text: "...",
    dataset: { id, openerId: type },
    attrs: { type: "button" },
  });

  if (editTarget) {
    btnEdit.setAttribute("data-bs-toggle", "modal");
    btnEdit.setAttribute("data-bs-target", editTarget);
  }

  actions.append(btnRemove, btnEdit);
  return actions;
}

function buildCard({
  id,
  title,
  titleClass = "card-title mb-0 text-truncate",
  bodyClass = "card-body d-flex flex-column",
  subtitle, // опционально (например баланс)
  subtitleClass = "card-text mt-2 mb-3",
  deleteClass,
  editClass,
  editTarget, // например "#editAccountModal"
  type,
} = {}) {
  const head = el("div", {
    className: "d-flex align-items-start justify-content-between gap-2",
  });

  const h5 = el("h5", { className: titleClass, text: title });
  const actions = createActions({
    id,
    deleteClass,
    editClass,
    editTarget,
    type,
  });

  head.append(h5, actions);

  const bodyChildren = [head];

  if (subtitle != null) {
    bodyChildren.push(
      el("p", { className: subtitleClass, text: String(subtitle) })
    );
  }

  const cardBody = el("div", { className: bodyClass }, bodyChildren);

  const card = el("div", { className: "card h-100" }, [cardBody]);

  const wrapper = el(
    "div",
    {
      className: "col",
      dataset: { id }, // wrapper.dataset.id
    },
    [card]
  );

  return wrapper;
}
