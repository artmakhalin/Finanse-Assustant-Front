# Finance Assistant — Frontend

Frontend for a pet project to manage personal finances: **accounts**, **categories**, **transactions** (INCOME / EXPENSE / TRANSFER), and a **report** for a selected period.

**Tech stack:** Vanilla JavaScript (ES Modules) + Bootstrap 5.

---

## Features

### Authentication
- Registration: `register.html`
- Login: `index.html`
- Logout
- Protected pages via `requireAuth()` (if there is no session — redirect to login)

### Accounts
- Create an account (title + starting balance)
- Edit (title / balance)
- Delete

### Categories
- **INCOME** and **EXPENSE** categories
- Create / edit / delete categories
- Categories are rendered by type (separate sections on the Accounts page)

### Transactions
Create a transaction from a modal:
- **INCOME**: Account To + Category + Amount
- **EXPENSE**: Account From + Category + Amount
- **TRANSFER**: Account From + Account To + Amount  
  (category is taken from the `TRANSFER` category group)

Validation approach:
- Client-side “fast” validation (empty fields, negative amounts, same accounts for transfer)
- Final validation is always enforced on the backend

### Report
- Report for a period (Start date / End date) and transaction type
- Date range validation on the frontend
- Render results list + **Clear** button

---

## Project structure

```
FinanseAssistantFront/
├─ index.html                 # Login
├─ register.html              # Registration
├─ accounts.html              # Accounts/Categories/Transactions
├─ report.html                # Report
└─ assets/
   ├─ css/
   │  └─ style.css
   └─ js/
      ├─ api.js               # fetch wrapper + ApiError
      ├─ auth.js              # requireAuth / logout
      ├─ config.js            # API_BASE + endpoints
      ├─ ui.js                # alerts + API error rendering
      └─ pages/
         ├─ login.page.js
         ├─ register.page.js
         ├─ accounts.page.js
         └─ report.page.js
```

---

## Quick start

### 1) Configure the API base URL

File: `assets/js/config.js`

If `API_BASE` is an empty string:

```js
export const API_BASE = "";
```

…the frontend expects the backend on the **same origin** (same domain/port).

Common setups:

- **Backend serves static files** (simplest deploy): keep `API_BASE = ""`.
- **Frontend and backend run separately** (local development): set a full URL, e.g.
  ```js
  export const API_BASE = "http://localhost:8080";
  ```
  Then make sure backend has **CORS** configured correctly (and cookies enabled).

> `api.js` uses `credentials: "include"`, so with cross-origin requests you’ll need:
> - `Access-Control-Allow-Credentials: true`
> - a specific `Access-Control-Allow-Origin` (not `*`)
> - correct cookie attributes (`SameSite` / `Secure`, especially if HTTPS)

### 2) Run the frontend

This is a static frontend — serve it with any static web server.

Examples:

**VS Code Live Server**
- Open the project folder
- Right click `index.html` → “Open with Live Server”

**Node (http-server)**
```bash
npx http-server .
```

**Python**
```bash
python -m http.server 5500
```

Open:
- Login: `http://localhost:5500/index.html`
- Accounts: `http://localhost:5500/accounts.html`
- Report: `http://localhost:5500/report.html`

---

## UX notes

- `register.page.js` shows “Repeat password” only after the user starts typing a password and clears it when the field gets hidden.
- API errors are rendered via `showApiError()`; field mapping comes from `fieldLabels` / `labels`.

---

## Best practices implemented

- Single HTTP layer (`api.js`) with consistent body parsing + `ApiError`
- `credentials: "include"` is centralized (not duplicated across the app)
- UI helpers (`ui.js`) + unified error formatting
- Per-page modules (`assets/js/pages/*`)
- Event delegation for lists (edit/delete clicks)

---
