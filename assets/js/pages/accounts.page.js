import { requireAuth, logout } from "../auth.js";
import { request } from "../api.js";
import { showAlert, showApiError } from "../ui.js";
import { API_ACCOUNTS } from "../config.js";
import { API_CATEGORIES } from "../config.js";
import { API_TRANSACTIONS } from "../config.js";

//Const / Labels
const fieldLabels = {
  accountName: "Account title",
  balance: "Balance",
  description: "Category description",
  accountTo: "Account To",
  accountFrom: "Account From",
  sum: "Sum of transaction",
  categoryIdList: "Category of transaction",
};

const typeLabels = {
  INCOME: "income",
  EXPENSE: "expenses",
};

const CATEGORY_TYPES = ["INCOME", "EXPENSE", "TRANSFER"];

//DOM
const btnLogout = document.getElementById("btnLogout");

const radioCategories = document.querySelectorAll(".form-check-input");

const selectAccountFrom = document.getElementById("selectAccountFrom");
const selectAccountTo = document.getElementById("selectAccountTo");
const selectCategory = document.getElementById("selectCategory");

const addAccountForm = document.getElementById("createAccountForm");
const addCategoryForm = document.getElementById("createCategoryForm");
const addTransactionForm = document.getElementById("addTransactionForm");
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
const alertBoxModalCreateTransaction = document.getElementById(
  "alertBoxModalCreateTransaction"
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
const addCategoryModal = document.getElementById("addCategoryModal");
const addTransactionModal = document.getElementById("addTransactionModal");
const editAccountModal = document.getElementById("editAccountModal");
const editCategoryModal = document.getElementById("editCategoryModal");

//State
const state = {
  accounts: [],
  categoriesByType: { INCOME: [], EXPENSE: [], TRANSFER: [] },
  editing: { accountId: null, categoryId: null },
  currentCategoryType: null,
  currentTransactionType: null,
};

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
  addTransactionForm.addEventListener("submit", onAddTransactionSubmit);

  for (const btn of categoryOpeners) {
    btn.addEventListener("click", onCategoryOpenerClick);
  }

  for (const radio of radioCategories) {
    radio.addEventListener("change", onRadioCategoryChecked);
  }

  addAccountModal.addEventListener(
    "hidden.bs.modal",
    onCreateAccountModalHidden
  );

  editAccountModal.addEventListener(
    "hidden.bs.modal",
    onEditAccountModalHidden
  );

  addCategoryModal.addEventListener(
    "hidden.bs.modal",
    onCreateCategoryModalHidden
  );

  editCategoryModal.addEventListener(
    "hidden.bs.modal",
    onEditCategoryModalHidden
  );

  addTransactionModal.addEventListener(
    "show.bs.modal",
    onAddTransactionModalShown
  );

  addTransactionModal.addEventListener(
    "hidden.bs.modal",
    onAddTransactionModalHidden
  );

  accountsDiv.addEventListener("click", onAccountsClick);

  incomeDiv.addEventListener("click", onCategoriesClick);
  expensesDiv.addEventListener("click", onCategoriesClick);
}

async function onLogoutClick() {
  await logout();
}

async function onCreateAccountSubmit(e) {
  e.preventDefault();
  alertBoxModalCreateAccount.innerHTML = "";

  const fd = new FormData(addAccountForm);

  const correctBalance = validateMoneyAmount(
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
      state.accounts.push(data);
      renderAccounts(state.accounts);

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
  if (!state.editing.accountId) return;
  const currentAccount = state.accounts.find(
    (acc) => acc.accountId == state.editing.accountId
  );

  await updateAccount(currentAccount);
}

async function onCreateCategorySubmit(e) {
  e.preventDefault();
  alertBoxModalCreateCategory.innerHTML = "";

  if (!state.currentCategoryType) {
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
    type: state.currentCategoryType,
  };

  try {
    const data = await request(`${API_CATEGORIES}`, {
      method: "POST",
      body: payload,
    });

    if (data) {
      state.categoriesByType[state.currentCategoryType].push(data);
      renderCategories(
        state.categoriesByType[state.currentCategoryType],
        state.currentCategoryType
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
  e.preventDefault();
  if (!state.editing.categoryId || !state.currentCategoryType) return;
  const currentCategory = state.categoriesByType[
    state.currentCategoryType
  ].find((cat) => cat.categoryId == state.editing.categoryId);

  if (!currentCategory) {
    showAlert(alertBoxModalEditCategory, "danger", "Category not found");
    return;
  }

  await updateCategory(currentCategory);
}

async function onAddTransactionSubmit(e) {
  e.preventDefault();
  alertBoxModalCreateTransaction.innerHTML = "";

  const fd = new FormData(addTransactionForm);

  const correctSum = validateMoneyAmount(
    fd,
    "sum",
    alertBoxModalCreateTransaction
  );
  if (correctSum === null) return;

  let currentCategoryId = selectCategory.value;
  const errors = [];

  if (state.currentTransactionType === "TRANSFER") {
    const transferCat = state.categoriesByType["TRANSFER"][0];
    if (transferCat) {
      currentCategoryId = transferCat.categoryId;
    } else {
      errors.push("Transfer category not found");
    }
  }

  if (state.currentTransactionType === "TRANSFER") {
    if (!selectAccountFrom.value || !selectAccountTo.value) {
      errors.push("Account From and Account To can't be empty");
    }

    if (selectAccountFrom.value === selectAccountTo.value) {
      errors.push("Account From and Account To should be different");
    }
  }

  if (state.currentTransactionType === "INCOME") {
    if (!selectAccountTo.value) {
      errors.push("Account To can't be empty");
    }
    if (!selectCategory.value) {
      errors.push("Transaction category can't be empty");
    }
  }

  if (state.currentTransactionType === "EXPENSE") {
    if (!selectAccountFrom.value) {
      errors.push("Account From can't be empty");
    }
    if (!selectCategory.value) {
      errors.push("Transaction category can't be empty");
    }
  }

  if (errors.length) {
    showAlert(alertBoxModalCreateTransaction, "danger", errors.join(" | "));
    return;
  }

  const payload = {
    accountTo: selectAccountTo.value ? selectAccountTo.value : null,
    accountFrom: selectAccountFrom.value ? selectAccountFrom.value : null,
    sum: correctSum,
    categoryIdList: [currentCategoryId],
  };

  try {
    const data = await request(`${API_TRANSACTIONS}`, {
      method: "POST",
      body: payload,
    });

    if (data) {
      await loadAccounts();

      showAlert(alertBox, "success", "Transaction made");
      hideModal(addTransactionModal);
    }
  } catch (err) {
    showApiError(err, alertBoxModalCreateTransaction, {
      fallback: "Error when creating transaction",
      fieldLabels,
    });
  }
}

function onCategoryOpenerClick(e) {
  state.currentCategoryType = e.currentTarget.dataset.openerId;
}

function onRadioCategoryChecked(e) {
  applyTransactionType(e.target.value);
}

function applyTransactionType(type) {
  state.currentTransactionType = type;

  if (type === "TRANSFER") {
    selectCategory.value = "";
    selectCategory.disabled = true;
    selectAccountFrom.disabled = false;
    selectAccountTo.disabled = false;
    return;
  }

  selectCategory.disabled = false;
  fillCategoriesSelect(selectCategory, type, "Select Category");

  if (type === "INCOME") {
    selectAccountFrom.value = "";
    selectAccountFrom.disabled = true;
    selectAccountTo.disabled = false;
  }

  if (type === "EXPENSE") {
    selectAccountFrom.disabled = false;
    selectAccountTo.value = "";
    selectAccountTo.disabled = true;
  }
}

function onCreateAccountModalHidden() {
  addAccountForm.reset();
  alertBoxModalCreateAccount.innerHTML = "";
}

function onEditAccountModalHidden() {
  state.editing.accountId = null;
  editAccountForm.reset();
  alertBoxModalEditAccount.innerHTML = "";
}

function onCreateCategoryModalHidden() {
  state.currentCategoryType = null;
  addCategoryForm.reset();
  alertBoxModalCreateCategory.innerHTML = "";
}

function onEditCategoryModalHidden() {
  state.currentCategoryType = null;
  state.editing.categoryId = null;
  editCategoryForm.reset();
  alertBoxModalEditCategory.innerHTML = "";
}

function onAddTransactionModalHidden() {
  addTransactionForm.reset();
  alertBoxModalCreateTransaction.innerHTML = "";
  state.currentTransactionType = null;
}

function onAddTransactionModalShown() {
  const radioTransfer = document.getElementById("radioTransfer");
  radioTransfer.disabled = !state.categoriesByType.TRANSFER?.length;

  if (radioTransfer.disabled && radioTransfer.checked) {
    document.getElementById("radioIncome").checked = true;
  }

  fillAccountsSelect(selectAccountTo, state.accounts, "Select Account To");
  fillAccountsSelect(selectAccountFrom, state.accounts, "Select Account From");

  const checked = addTransactionForm.elements["TransactionType"].value;
  applyTransactionType(checked);
}

function fillAccountsSelect(selectEl, accounts, placeholderText) {
  selectEl.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholderText;
  ph.selected = true;
  ph.disabled = true;
  selectEl.appendChild(ph);

  const frag = document.createDocumentFragment();

  accounts.forEach((acc) => {
    const opt = document.createElement("option");
    opt.textContent = `${acc.accountName} (${acc.balance})`;
    opt.value = acc.accountId;

    frag.appendChild(opt);
  });

  selectEl.appendChild(frag);
}

function fillCategoriesSelect(selectEl, type, placeholderText) {
  selectEl.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholderText;
  ph.selected = true;
  ph.disabled = true;
  selectEl.appendChild(ph);

  const frag = document.createDocumentFragment();

  state.categoriesByType[type].forEach((cat) => {
    const opt = document.createElement("option");
    opt.textContent = `${cat.description}`;
    opt.value = cat.categoryId;

    frag.appendChild(opt);
  });

  selectEl.appendChild(frag);
}

function onAccountsClick(e) {
  const editBtn = e.target.closest("button.account-edit");
  const deleteBtn = e.target.closest("button.account-delete");

  if (deleteBtn) {
    if (!confirm("Delete this Account?")) return;

    return deleteAccount(deleteBtn.dataset.id);
  }

  if (editBtn) {
    alertBoxModalEditAccount.innerHTML = "";
    const id = editBtn.dataset.id;

    const currentAccount = state.accounts.find((acc) => acc.accountId == id);
    state.editing.accountId = id;

    const newNameInput = document.getElementById("newAccountName");
    const newBalanceInput = document.getElementById("newBalance");

    newNameInput.value = currentAccount.accountName;
    newBalanceInput.value = currentAccount.balance;
  }
}

function onCategoriesClick(e) {
  const btn = e.target.closest("button.category-edit, button.category-delete");
  if (!btn) return;

  const type = btn.dataset.openerId;
  const id = btn.dataset.id;

  if (!type) {
    showAlert(
      alertBoxModalCreateCategory,
      "danger",
      "Choose category type first"
    );
    return;
  }
  state.currentCategoryType = type;

  if (btn.classList.contains("category-delete")) {
    if (!confirm("Delete this Category?")) return;

    return deleteCategory(id, type);
  }

  if (btn.classList.contains("category-edit")) {
    alertBoxModalEditCategory.innerHTML = "";

    const currentCategory = state.categoriesByType[
      state.currentCategoryType
    ].find((cat) => cat.categoryId == id);
    state.editing.categoryId = id;

    const newDescriptionInput = document.getElementById("newDescription");
    newDescriptionInput.value = currentCategory.description;
  }
}

//Business logic
async function loadAccounts() {
  try {
    const data = await request(`${API_ACCOUNTS}`);
    state.accounts = data.list;
    renderAccounts(state.accounts);
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
      state.categoriesByType[t] = results[i].list;
      if (t !== "TRANSFER") {
        renderCategories(state.categoriesByType[t], t);
      }
    });
  } catch (err) {
    showApiError(err, alertBox, {
      fallback: "Error when loading categories",
      fieldLabels,
    });
  }
}

async function deleteCategory(id, type) {
  try {
    await request(`${API_CATEGORIES}/${id}`, { method: "DELETE" });
    showAlert(alertBox, "success", "Category removed");
    state.categoriesByType[type] = state.categoriesByType[type].filter(
      (cat) => cat.categoryId != id
    );

    renderCategories(state.categoriesByType[type], type);
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
    state.accounts = state.accounts.filter((acc) => acc.accountId != id);

    renderAccounts(state.accounts);
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

    const correctBalance = validateMoneyAmount(
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

    state.accounts = state.accounts.map((acc) =>
      acc.accountId == id ? updatedAccount : acc
    );
    renderAccounts(state.accounts);

    showAlert(alertBox, "success", "Account updated");
    editAccountForm.reset();
    state.editing.accountId = null;
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

    const payLoad = {
      description: fd.get("newDescription")?.trim(),
      type: type,
    };

    const updatedCategory = await request(`${API_CATEGORIES}/${id}`, {
      method: "PUT",
      body: payLoad,
    });

    state.categoriesByType[type] = state.categoriesByType[type].map((cat) =>
      cat.categoryId == id ? updatedCategory : cat
    );
    renderCategories(state.categoriesByType[type], type);

    showAlert(alertBox, "success", "Category updated");
    editCategoryForm.reset();
    state.editing.categoryId = null;
    state.currentCategoryType = null;
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

function validateMoneyAmount(formData, fieldName, box) {
  const balance = Number(formData.get(fieldName));
  if (!Number.isFinite(balance) || balance < 0) {
    showAlert(box, "danger", "Invalid money amount");
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
