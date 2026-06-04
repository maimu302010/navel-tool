# Chapter Navigator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free local web page that generates chapter search links and stores lightweight reading shortcuts.

**Architecture:** Use one static `index.html` with embedded CSS and JavaScript. JavaScript is split into focused functions for query generation, provider URL generation, storage, validation, and rendering.

**Tech Stack:** HTML, CSS, vanilla JavaScript, browser `localStorage`.

---

## File Structure

- Create `index.html`: complete local browser tool with markup, styles, and script.
- Modify `README.md`: describe how to open and use the tool.

## Task 1: Static Page Shell

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create the page structure**

Create `index.html` with a compact app shell:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>navel-tool</title>
</head>
<body>
  <main class="app">
    <section class="panel search-panel" aria-labelledby="search-title">
      <div class="title-row">
        <div>
          <p class="eyebrow">Chapter Navigator</p>
          <h1 id="search-title">内容章节定位</h1>
        </div>
        <button class="icon-button" id="clearFormButton" type="button" aria-label="清空输入" title="清空输入">×</button>
      </div>

      <form id="searchForm" novalidate>
        <label for="titleInput">名称</label>
        <input id="titleInput" name="title" autocomplete="off" placeholder="重生2014我刑侦之王">
        <p class="field-error" id="titleError"></p>

        <label for="chapterInput">章节</label>
        <input id="chapterInput" name="chapter" inputmode="numeric" autocomplete="off" placeholder="668">
        <p class="field-error" id="chapterError"></p>

        <div class="actions">
          <button class="primary" type="submit">生成入口</button>
          <button id="saveRecordButton" class="secondary" type="button">保存记录</button>
        </div>
      </form>
    </section>

    <section class="panel results-panel" aria-labelledby="results-title">
      <div class="section-head">
        <h2 id="results-title">搜索入口</h2>
        <button id="openAllButton" class="secondary small" type="button" disabled>打开全部</button>
      </div>
      <div id="message" class="message" role="status"></div>
      <div id="queryList" class="query-list empty">输入名称和章节后生成入口</div>
    </section>

    <section class="panel history-panel" aria-labelledby="history-title">
      <div class="section-head">
        <h2 id="history-title">最近记录</h2>
        <button id="clearHistoryButton" class="secondary small" type="button">清空</button>
      </div>
      <div id="historyList" class="history-list empty">暂无记录</div>
    </section>
  </main>
</body>
</html>
```

- [ ] **Step 2: Verify shell renders**

Open `index.html` directly in a browser.

Expected: the page shows three panels: search form, search entry area, and recent records.

## Task 2: Styling

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add embedded CSS**

Add a `<style>` block in `index.html` with compact utility styling:

```css
:root {
  color-scheme: light;
  font-family: "Microsoft YaHei", "Segoe UI", Arial, sans-serif;
  background: #f4f6f8;
  color: #17202a;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f9fb 0%, #eef2f5 100%);
}

.app {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 24px 0;
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 16px;
}

.panel {
  background: #ffffff;
  border: 1px solid #d9e0e7;
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(23, 32, 42, 0.08);
}

.search-panel {
  grid-row: span 2;
  align-self: start;
}

.title-row,
.section-head,
.actions,
.provider-row,
.history-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-row,
.section-head {
  justify-content: space-between;
}

.eyebrow {
  margin: 0 0 4px;
  color: #586a7c;
  font-size: 12px;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0;
  font-size: 28px;
}

h2 {
  margin-bottom: 0;
  font-size: 18px;
}

form {
  margin-top: 22px;
}

label {
  display: block;
  margin: 14px 0 6px;
  color: #33475b;
  font-weight: 600;
}

input {
  width: 100%;
  min-height: 42px;
  border: 1px solid #c8d2dc;
  border-radius: 6px;
  padding: 9px 11px;
  font-size: 15px;
  color: #17202a;
  background: #fbfcfd;
}

input:focus {
  border-color: #1f7a8c;
  outline: 3px solid rgba(31, 122, 140, 0.16);
}

.field-error {
  min-height: 18px;
  margin: 5px 0 0;
  color: #b42318;
  font-size: 12px;
}

button,
a.button-link {
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.primary {
  background: #1f7a8c;
  color: #ffffff;
}

.secondary,
a.button-link {
  background: #ffffff;
  border-color: #c8d2dc;
  color: #24384b;
}

.small {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 13px;
}

.icon-button {
  width: 34px;
  height: 34px;
  padding: 0;
  background: #ffffff;
  border-color: #c8d2dc;
  color: #586a7c;
  font-size: 20px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.message {
  min-height: 20px;
  margin: 14px 0;
  color: #586a7c;
  font-size: 13px;
}

.query-list,
.history-list {
  display: grid;
  gap: 12px;
}

.empty {
  color: #76889a;
  font-size: 14px;
}

.query-card,
.history-card {
  border: 1px solid #d9e0e7;
  border-radius: 8px;
  padding: 14px;
  background: #fbfcfd;
}

.query-text,
.history-title {
  margin: 0 0 10px;
  color: #17202a;
  font-weight: 700;
}

.provider-row {
  flex-wrap: wrap;
}

.history-card input {
  margin: 8px 0;
}

.history-meta {
  margin: 0 0 8px;
  color: #586a7c;
  font-size: 13px;
}

@media (max-width: 760px) {
  .app {
    width: min(100vw - 20px, 560px);
    grid-template-columns: 1fr;
    padding: 10px 0;
  }

  .search-panel {
    grid-row: auto;
  }

  .actions {
    flex-direction: column;
  }

  .actions button {
    width: 100%;
  }
}
```

- [ ] **Step 2: Verify mobile and desktop layout**

Open `index.html` at desktop width and narrow mobile width.

Expected: no text overlap; the search form stays first; buttons remain readable.

## Task 3: Query Generation and Search Links

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add JavaScript state and functions**

Add a `<script>` block before `</body>`:

```javascript
const searchProviders = [
  { name: "Bing", url: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}` },
  { name: "百度", url: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}` },
  { name: "搜狗", url: (query) => `https://www.sogou.com/web?query=${encodeURIComponent(query)}` },
  { name: "360", url: (query) => `https://www.so.com/s?q=${encodeURIComponent(query)}` }
];

const state = {
  queries: []
};

const elements = {
  form: document.querySelector("#searchForm"),
  titleInput: document.querySelector("#titleInput"),
  chapterInput: document.querySelector("#chapterInput"),
  titleError: document.querySelector("#titleError"),
  chapterError: document.querySelector("#chapterError"),
  queryList: document.querySelector("#queryList"),
  openAllButton: document.querySelector("#openAllButton"),
  message: document.querySelector("#message"),
  clearFormButton: document.querySelector("#clearFormButton")
};

function normalizeTitle(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeChapter(value) {
  return value.trim().replace(/^第/, "").replace(/章$/, "");
}

function validateInput(title, chapter) {
  const errors = {};
  if (!title) {
    errors.title = "填个名称先。";
  }
  if (!/^[1-9]\d*$/.test(chapter)) {
    errors.chapter = "章节要是正整数。";
  }
  return errors;
}

function buildQueries(title, chapter) {
  return [
    `${title} 第${chapter}章`,
    `${title} ${chapter}章`,
    `${title} 最新章节 ${chapter}`
  ];
}

function buildSearchLinks(query) {
  return searchProviders.map((provider) => ({
    provider: provider.name,
    url: provider.url(query)
  }));
}

function showMessage(text) {
  elements.message.textContent = text;
}

function renderErrors(errors) {
  elements.titleError.textContent = errors.title || "";
  elements.chapterError.textContent = errors.chapter || "";
}

function renderQueries() {
  if (state.queries.length === 0) {
    elements.queryList.className = "query-list empty";
    elements.queryList.textContent = "输入名称和章节后生成入口";
    elements.openAllButton.disabled = true;
    return;
  }

  elements.queryList.className = "query-list";
  elements.queryList.innerHTML = state.queries.map((query) => {
    const links = buildSearchLinks(query).map((link) => (
      `<a class="button-link small" href="${link.url}" target="_blank" rel="noopener noreferrer">${link.provider}</a>`
    )).join("");

    return `
      <article class="query-card">
        <p class="query-text">${escapeHtml(query)}</p>
        <div class="provider-row">${links}</div>
      </article>
    `;
  }).join("");

  elements.openAllButton.disabled = false;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function generateFromForm() {
  const title = normalizeTitle(elements.titleInput.value);
  const chapter = normalizeChapter(elements.chapterInput.value);
  const errors = validateInput(title, chapter);
  renderErrors(errors);

  if (Object.keys(errors).length > 0) {
    state.queries = [];
    renderQueries();
    showMessage("输入修一下，再生成。");
    return null;
  }

  state.queries = buildQueries(title, chapter);
  renderQueries();
  showMessage(`已生成 ${state.queries.length} 组搜索入口。`);
  return { title, chapter };
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateFromForm();
});

elements.openAllButton.addEventListener("click", () => {
  state.queries.flatMap(buildSearchLinks).forEach((link) => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  });
});

elements.clearFormButton.addEventListener("click", () => {
  elements.titleInput.value = "";
  elements.chapterInput.value = "";
  state.queries = [];
  renderErrors({});
  renderQueries();
  showMessage("");
  elements.titleInput.focus();
});

renderQueries();
```

- [ ] **Step 2: Verify generated links**

Open `index.html`, enter `重生2014我刑侦之王` and `668`, then click `生成入口`.

Expected: three query cards are shown, each with Bing, 百度, 搜狗, and 360 buttons. Link URLs contain encoded versions of the query.

## Task 4: Recent Records and URL Shortcuts

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add storage functions and history rendering**

Extend the script with:

```javascript
const storageKey = "navel-tool:recent-records";
const sessionRecords = [];

Object.assign(elements, {
  saveRecordButton: document.querySelector("#saveRecordButton"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton")
});

function loadRecords() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    showMessage("最近记录读取失败，本次会临时保存。");
    return sessionRecords;
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
  } catch (error) {
    sessionRecords.splice(0, sessionRecords.length, ...records);
    showMessage("最近记录无法写入浏览器存储，本次只临时保存。");
  }
}

function getRecords() {
  return loadRecords().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function upsertRecord(title, chapter, chapterUrl = "") {
  const records = getRecords();
  const existing = records.find((record) => record.title === title && record.chapter === chapter);
  const next = existing || {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    chapter,
    chapterUrl: ""
  };

  next.chapterUrl = chapterUrl || next.chapterUrl || "";
  next.updatedAt = new Date().toISOString();

  const merged = [next, ...records.filter((record) => record.id !== next.id)].slice(0, 20);
  saveRecords(merged);
  renderHistory();
}

function isValidShortcutUrl(value) {
  if (!value.trim()) {
    return true;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function renderHistory() {
  const records = getRecords();
  if (records.length === 0) {
    elements.historyList.className = "history-list empty";
    elements.historyList.textContent = "暂无记录";
    return;
  }

  elements.historyList.className = "history-list";
  elements.historyList.innerHTML = records.map((record) => `
    <article class="history-card" data-id="${record.id}">
      <p class="history-title">${escapeHtml(record.title)} 第${escapeHtml(record.chapter)}章</p>
      <p class="history-meta">更新于 ${new Date(record.updatedAt).toLocaleString()}</p>
      <input class="shortcut-input" value="${escapeHtml(record.chapterUrl || "")}" placeholder="粘贴章节链接">
      <div class="history-actions">
        <button class="secondary small use-record" type="button">填入</button>
        <button class="secondary small save-url" type="button">保存链接</button>
        <a class="button-link small ${record.chapterUrl ? "" : "disabled-link"}" href="${escapeHtml(record.chapterUrl || "#")}" target="_blank" rel="noopener noreferrer">打开链接</a>
      </div>
      <p class="field-error record-error"></p>
    </article>
  `).join("");
}

function findRecord(id) {
  return getRecords().find((record) => record.id === id);
}

elements.saveRecordButton.addEventListener("click", () => {
  const result = generateFromForm();
  if (!result) {
    return;
  }
  upsertRecord(result.title, result.chapter);
  showMessage("记录已保存。");
});

elements.historyList.addEventListener("click", (event) => {
  const card = event.target.closest(".history-card");
  if (!card) {
    return;
  }

  const record = findRecord(card.dataset.id);
  if (!record) {
    return;
  }

  if (event.target.classList.contains("use-record")) {
    elements.titleInput.value = record.title;
    elements.chapterInput.value = record.chapter;
    generateFromForm();
  }

  if (event.target.classList.contains("save-url")) {
    const input = card.querySelector(".shortcut-input");
    const error = card.querySelector(".record-error");
    if (!isValidShortcutUrl(input.value)) {
      error.textContent = "链接要以 http:// 或 https:// 开头。";
      return;
    }
    error.textContent = "";
    upsertRecord(record.title, record.chapter, input.value.trim());
    showMessage("章节链接已保存。");
  }
});

elements.clearHistoryButton.addEventListener("click", () => {
  saveRecords([]);
  renderHistory();
  showMessage("最近记录已清空。");
});

renderHistory();
```

Add disabled link CSS:

```css
.disabled-link {
  pointer-events: none;
  opacity: 0.45;
}
```

- [ ] **Step 2: Verify history behavior**

Open `index.html`, generate and save `重生2014我刑侦之王` chapter `668`, refresh the browser, and inspect recent records.

Expected: record persists after refresh. Saving the same title/chapter updates the existing record. Invalid shortcut URLs show a record-level error. Valid `https://example.com` shortcuts save and open in a new tab.

## Task 5: README and Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Replace `README.md` content with:

```markdown
# navel-tool

A tiny local chapter navigation helper.

## Use

Open `index.html` directly in a browser, enter a book title and chapter number, then generate search-engine entry links.

The tool stores recent records and user-pasted chapter shortcuts in browser `localStorage`. It does not fetch, render, cache, or download page text.
```

- [ ] **Step 2: Run final manual verification**

Open `index.html` directly in a browser and verify:

- `重生2014我刑侦之王` + `668` generates three query variants.
- Provider links open encoded search URLs.
- Recent records persist after refresh.
- Pasted shortcut validation accepts `https://example.com` and rejects `abc`.
- No code path fetches page content.

- [ ] **Step 3: Commit**

Run:

```bash
git add index.html README.md docs/superpowers/plans/2026-06-04-chapter-navigator.md
git commit -m "Build chapter navigator"
```

Expected: commit succeeds with the static app, README update, and plan document.
