# Search Aggregator V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the tool into a local Node-powered search aggregator that shows ranked candidate chapter links.

**Architecture:** Add a small Node HTTP server that serves static files and exposes `/api/search`. Keep search normalization, parsing, scoring, and fallback-link generation in `src/search-service.js`, with unit tests in `test/search-service.test.js`.

**Tech Stack:** Node.js 25, vanilla HTML/CSS/JavaScript, `cheerio`, Node built-in test runner.

---

## File Structure

- Create `package.json`: scripts and dependency metadata.
- Create `server.js`: local HTTP server and API route.
- Create `src/search-service.js`: search query building, DuckDuckGo fetching, parsing, scoring, and validation.
- Create `test/search-service.test.js`: unit tests for service behavior.
- Modify `index.html`: replace link-only behavior with API-backed candidate search plus fallback links.
- Modify `README.md`: document `npm install`, `npm start`, and static fallback.

## Task 1: Node Project and Service Tests

**Files:**
- Create: `package.json`
- Create: `src/search-service.js`
- Create: `test/search-service.test.js`

- [ ] **Step 1: Add package metadata**

Create `package.json`:

```json
{
  "name": "navel-tool",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "cheerio": "^1.0.0"
  }
}
```

- [ ] **Step 2: Write failing service tests**

Create `test/search-service.test.js`:

```javascript
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildChapterQuery,
  normalizeChapter,
  normalizeTitle,
  parseDuckDuckGoResults,
  scoreResult,
  validateSearchInput
} from "../src/search-service.js";

const fixtureHtml = `
<html>
  <body>
    <div class="result">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fbook%2F668.html">重生2014我刑侦之王 第668章 真相</a>
      <a class="result__snippet">重生2014我刑侦之王 最新章节 第668章 搜索摘要</a>
    </div>
    <div class="result">
      <a class="result__a" href="https://other.example/search">重生2014我刑侦之王 小说目录</a>
      <a class="result__snippet">目录和章节列表</a>
    </div>
  </body>
</html>
`;

describe("search-service", () => {
  it("normalizes title and chapter", () => {
    assert.equal(normalizeTitle("  重生2014   我刑侦之王  "), "重生2014 我刑侦之王");
    assert.equal(normalizeChapter("第668章"), "668");
  });

  it("validates required title and positive chapter", () => {
    assert.deepEqual(validateSearchInput("", "668"), {
      ok: false,
      message: "书名和章节必填，章节必须是正整数。"
    });
    assert.deepEqual(validateSearchInput("书名", "0"), {
      ok: false,
      message: "书名和章节必填，章节必须是正整数。"
    });
    assert.deepEqual(validateSearchInput("书名", "668"), { ok: true });
  });

  it("builds the main chapter query", () => {
    assert.equal(buildChapterQuery("重生2014我刑侦之王", "668"), "重生2014我刑侦之王 第668章");
  });

  it("parses DuckDuckGo result HTML", () => {
    const results = parseDuckDuckGoResults(fixtureHtml);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, "重生2014我刑侦之王 第668章 真相");
    assert.equal(results[0].url, "https://example.com/book/668.html");
    assert.equal(results[0].domain, "example.com");
    assert.equal(results[0].snippet, "重生2014我刑侦之王 最新章节 第668章 搜索摘要");
  });

  it("scores direct chapter matches above generic matches", () => {
    const strong = scoreResult({
      title: "重生2014我刑侦之王 第668章 真相",
      snippet: "重生2014我刑侦之王 最新章节 第668章",
      url: "https://example.com/book/668.html"
    }, "重生2014我刑侦之王", "668");

    const weak = scoreResult({
      title: "重生2014我刑侦之王 小说目录",
      snippet: "目录和章节列表",
      url: "https://example.com/book/index.html"
    }, "重生2014我刑侦之王", "668");

    assert.ok(strong.score > weak.score);
    assert.deepEqual(strong.badges, ["书名命中", "章节命中", "摘要命中"]);
  });
});
```

- [ ] **Step 3: Run tests to verify red**

Run: `npm test`

Expected: FAIL because `src/search-service.js` does not exist or does not export the tested functions.

## Task 2: Search Service Implementation

**Files:**
- Modify: `src/search-service.js`

- [ ] **Step 1: Implement service module**

Create `src/search-service.js`:

```javascript
import * as cheerio from "cheerio";

export function normalizeTitle(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeChapter(value) {
  return String(value || "").trim().replace(/^第/, "").replace(/章$/, "");
}

export function validateSearchInput(title, chapter) {
  if (!normalizeTitle(title) || !/^[1-9]\d*$/.test(normalizeChapter(chapter))) {
    return {
      ok: false,
      message: "书名和章节必填，章节必须是正整数。"
    };
  }
  return { ok: true };
}

export function buildChapterQuery(title, chapter) {
  return `${normalizeTitle(title)} 第${normalizeChapter(chapter)}章`;
}

export function buildFallbackLinks(title, chapter) {
  const query = buildChapterQuery(title, chapter);
  const encoded = encodeURIComponent(query);
  return [
    { provider: "Bing", url: `https://www.bing.com/search?q=${encoded}` },
    { provider: "百度", url: `https://www.baidu.com/s?wd=${encoded}` },
    { provider: "搜狗", url: `https://www.sogou.com/web?query=${encoded}` },
    { provider: "360", url: `https://www.so.com/s?q=${encoded}` }
  ];
}

export function parseDuckDuckGoResults(html) {
  const $ = cheerio.load(html);
  const results = [];

  $(".result").each((_, element) => {
    const titleNode = $(element).find(".result__a").first();
    const rawHref = titleNode.attr("href");
    const title = titleNode.text().trim();
    const snippet = $(element).find(".result__snippet").first().text().trim();
    const url = decodeDuckDuckGoUrl(rawHref);

    if (!title || !url) {
      return;
    }

    results.push({
      title,
      url,
      domain: getDomain(url),
      snippet
    });
  });

  return dedupeByUrl(results);
}

export function scoreResult(result, title, chapter) {
  const normalizedTitle = normalizeTitle(title);
  const normalizedChapter = normalizeChapter(chapter);
  const exactChapter = `第${normalizedChapter}章`;
  const looseChapter = `${normalizedChapter}章`;
  const resultTitle = result.title || "";
  const snippet = result.snippet || "";
  const url = result.url || "";
  const haystack = `${resultTitle} ${snippet}`;
  let score = 0;
  const badges = [];

  if (resultTitle.includes(normalizedTitle)) {
    score += 45;
    badges.push("书名命中");
  }
  if (haystack.includes(exactChapter)) {
    score += 35;
    badges.push("章节命中");
  } else if (haystack.includes(looseChapter)) {
    score += 25;
    badges.push("章节命中");
  }
  if (resultTitle.includes(normalizedChapter)) {
    score += 10;
  }
  if (snippet.includes(normalizedTitle)) {
    score += 15;
    badges.push("摘要命中");
  }
  if (url.includes(normalizedChapter)) {
    score += 5;
  }

  return {
    ...result,
    score,
    badges
  };
}

export async function searchCandidates({ title, chapter, fetchImpl = fetch, timeoutMs = 10000 }) {
  const cleanTitle = normalizeTitle(title);
  const cleanChapter = normalizeChapter(chapter);
  const validation = validateSearchInput(cleanTitle, cleanChapter);
  const fallbackLinks = buildFallbackLinks(cleanTitle || title, cleanChapter || chapter);

  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "INVALID_INPUT",
        message: validation.message,
        fallbackLinks
      }
    };
  }

  const query = buildChapterQuery(cleanTitle, cleanChapter);

  try {
    const html = await fetchDuckDuckGoHtml(query, fetchImpl, timeoutMs);
    const results = parseDuckDuckGoResults(html)
      .map((result) => scoreResult(result, cleanTitle, cleanChapter))
      .sort((left, right) => right.score - left.score)
      .slice(0, 12);

    return {
      ok: true,
      status: 200,
      body: {
        query,
        results,
        fallbackLinks
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      body: {
        error: "SEARCH_FAILED",
        message: "搜索暂时不可用，请使用备用搜索入口。",
        fallbackLinks
      }
    };
  }
}

async function fetchDuckDuckGoHtml(query, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 navel-tool/0.2",
        "Accept": "text/html"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Search failed with HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function decodeDuckDuckGoUrl(value) {
  if (!value) {
    return "";
  }

  let url = value.startsWith("//") ? `https:${value}` : value;

  try {
    const parsed = new URL(url);
    const encodedTarget = parsed.searchParams.get("uddg");
    if (encodedTarget) {
      url = encodedTarget;
    }
  } catch (error) {
    return "";
  }

  try {
    return new URL(url).toString();
  } catch (error) {
    return "";
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

function dedupeByUrl(results) {
  const seen = new Set();
  return results.filter((result) => {
    if (seen.has(result.url)) {
      return false;
    }
    seen.add(result.url);
    return true;
  });
}
```

- [ ] **Step 2: Run tests to verify green**

Run: `npm test`

Expected: PASS for all `search-service` tests.

## Task 3: HTTP Server

**Files:**
- Create: `server.js`

- [ ] **Step 1: Add server**

Create `server.js`:

```javascript
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { searchCandidates } from "./src/search-service.js";

const rootDir = resolve(import.meta.dirname);
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/api/search") {
    await handleSearch(requestUrl, response);
    return;
  }

  await serveStatic(requestUrl.pathname, response);
});

async function handleSearch(requestUrl, response) {
  const result = await searchCandidates({
    title: requestUrl.searchParams.get("title") || "",
    chapter: requestUrl.searchParams.get("chapter") || ""
  });

  writeJson(response, result.status, result.body);
}

async function serveStatic(pathname, response) {
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = normalize(join(rootDir, relativePath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    const contentType = mimeTypes[extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function writeJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

server.listen(port, () => {
  console.log(`navel-tool running at http://localhost:${port}`);
});
```

- [ ] **Step 2: Smoke test server**

Run: `npm start`

Expected: server logs `navel-tool running at http://localhost:3000`.

## Task 4: Front-End Candidate Results

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update result labels**

Change:

```html
<button class="primary" type="submit">生成入口</button>
<h2 id="results-title">搜索入口</h2>
```

to:

```html
<button class="primary" type="submit">搜索候选</button>
<h2 id="results-title">候选结果</h2>
```

- [ ] **Step 2: Add candidate card styles**

Add CSS:

```css
.candidate-card {
  border: 1px solid #d9e0e7;
  border-radius: 8px;
  padding: 14px;
  background: #fbfcfd;
}

.candidate-title {
  margin: 0 0 8px;
  color: #17202a;
  font-weight: 700;
  line-height: 1.4;
}

.candidate-domain,
.candidate-snippet {
  margin: 0 0 8px;
  color: #586a7c;
  font-size: 13px;
  line-height: 1.5;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 12px;
}

.badge {
  border-radius: 999px;
  background: #e7f3f5;
  color: #1f6673;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 700;
}

.score {
  background: #f1f4f7;
  color: #33475b;
}
```

- [ ] **Step 3: Replace submit flow with API-backed search**

Add state:

```javascript
state.candidates = [];
state.fallbackLinks = [];
state.loading = false;
```

Replace `generateFromForm` submit behavior with `searchFromForm`:

```javascript
async function searchFromForm() {
  const title = normalizeTitle(elements.titleInput.value);
  const chapter = normalizeChapter(elements.chapterInput.value);
  const errors = validateInput(title, chapter);
  renderErrors(errors);

  if (Object.keys(errors).length > 0) {
    state.queries = [];
    state.candidates = [];
    state.fallbackLinks = [];
    renderResults();
    showMessage("输入修一下，再搜索。");
    return null;
  }

  state.loading = true;
  state.queries = buildQueries(title, chapter);
  state.fallbackLinks = state.queries.flatMap(buildSearchLinks);
  renderResults();
  showMessage("正在搜索候选结果...");

  try {
    const response = await fetch(`/api/search?title=${encodeURIComponent(title)}&chapter=${encodeURIComponent(chapter)}`);
    const data = await response.json();
    state.candidates = data.results || [];
    state.fallbackLinks = data.fallbackLinks || state.fallbackLinks;

    if (!response.ok) {
      showMessage(data.message || "搜索失败，先用备用入口。");
    } else if (state.candidates.length === 0) {
      showMessage("没有抓到候选结果，先用备用入口。");
    } else {
      showMessage(`找到 ${state.candidates.length} 个候选结果。`);
    }
  } catch (error) {
    state.candidates = [];
    showMessage("本地服务不可用，先用备用入口。");
  } finally {
    state.loading = false;
    renderResults();
  }

  return { title, chapter };
}
```

Replace `renderQueries` with `renderResults`, keeping fallback cards visible when candidates are empty:

```javascript
function renderResults() {
  if (state.loading) {
    elements.queryList.className = "query-list empty";
    elements.queryList.textContent = "搜索中...";
    elements.openAllButton.disabled = true;
    return;
  }

  if (state.candidates.length > 0) {
    elements.queryList.className = "query-list";
    elements.queryList.innerHTML = state.candidates.map((candidate) => `
      <article class="candidate-card">
        <p class="candidate-title">${escapeHtml(candidate.title)}</p>
        <p class="candidate-domain">${escapeHtml(candidate.domain || "")}</p>
        <p class="candidate-snippet">${escapeHtml(candidate.snippet || "")}</p>
        <div class="badge-row">
          <span class="badge score">相关度 ${escapeHtml(candidate.score || 0)}</span>
          ${(candidate.badges || []).map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}
        </div>
        <a class="button-link small" href="${escapeHtml(candidate.url)}" target="_blank" rel="noopener noreferrer">打开候选</a>
      </article>
    `).join("");
    elements.openAllButton.disabled = false;
    return;
  }

  if (state.fallbackLinks.length > 0) {
    elements.queryList.className = "query-list";
    elements.queryList.innerHTML = `
      <article class="query-card">
        <p class="query-text">备用搜索入口</p>
        <div class="provider-row">
          ${state.fallbackLinks.map((link) => `<a class="button-link small" href="${link.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.provider)}</a>`).join("")}
        </div>
      </article>
    `;
    elements.openAllButton.disabled = false;
    return;
  }

  elements.queryList.className = "query-list empty";
  elements.queryList.textContent = "输入书名和章节后搜索候选";
  elements.openAllButton.disabled = true;
}
```

Update event handlers:

```javascript
elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await searchFromForm();
});
```

Update `openAllButton` to open candidate URLs when candidates exist, otherwise fallback links:

```javascript
elements.openAllButton.addEventListener("click", () => {
  const links = state.candidates.length > 0
    ? state.candidates.map((candidate) => ({ url: candidate.url }))
    : state.fallbackLinks;

  links.forEach((link) => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  });
});
```

Update save button to validate without forcing a network search:

```javascript
elements.saveRecordButton.addEventListener("click", () => {
  const title = normalizeTitle(elements.titleInput.value);
  const chapter = normalizeChapter(elements.chapterInput.value);
  const errors = validateInput(title, chapter);
  renderErrors(errors);
  if (Object.keys(errors).length > 0) {
    showMessage("输入修一下，再保存。");
    return;
  }
  upsertRecord(title, chapter);
  showMessage("记录已保存。");
});
```

Replace remaining `renderQueries()` calls with `renderResults()`.

- [ ] **Step 4: Verify UI behavior**

Run `npm start`, open `http://localhost:3000`, search `重生2014我刑侦之王` chapter `668`.

Expected: page shows candidate cards if API search succeeds, or fallback links if search fails.

## Task 5: README and Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Replace README use section with:

```markdown
# navel-tool

A tiny local novel chapter navigation helper.

## Use

Install dependencies:

```bash
npm install
```

Start the local search service:

```bash
npm start
```

Open `http://localhost:3000`, enter a book title and chapter number, then search for ranked candidate links.

The tool stores recent records and user-pasted chapter shortcuts in browser `localStorage`. It handles search-result metadata and links only; it does not fetch, render, cache, or download novel text.
```

- [ ] **Step 2: Run final verification**

Run:

```bash
npm test
```

Expected: all tests pass.

Run:

```bash
Select-String -Path server.js,src/search-service.js,index.html -Pattern "fetch\\(|readability|chapter content|innerHTML"
```

Expected: `fetch(` appears only for DuckDuckGo search and front-end API call. No code fetches candidate result URLs.

- [ ] **Step 3: Commit**

Run:

```bash
git add package.json package-lock.json server.js src/search-service.js test/search-service.test.js index.html README.md docs/superpowers/specs/2026-06-04-search-aggregator-v2-design.md docs/superpowers/plans/2026-06-04-search-aggregator-v2.md
git commit -m "Add search aggregation service"
git push
```

Expected: commit and push succeed.
