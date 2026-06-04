# Search Aggregator V2 Design

## Goal

Upgrade `navel-tool` from a search-link launcher into a local search aggregator that returns ranked candidate chapter pages for a given title and chapter number.

The tool should reduce manual searching. It should still avoid fetching, displaying, caching, or redistributing chapter章节. It only handles search-result metadata and user-opened links.

## Scope

First V2 release:

- Add a local Node.js server.
- Serve the existing front-end from the local server.
- Add `GET /api/search?title=<title>&chapter=<chapter>`.
- Query DuckDuckGo HTML search for candidate web results.
- Parse result title, snippet, URL, and source domain.
- Score results by title/chapter relevance.
- Return ranked JSON results to the front-end.
- Keep the existing search-engine entry links as fallback actions.
- Keep recent records and user-pasted chapter shortcuts in browser `localStorage`.

Out of scope:

- Fetching candidate chapter pages.
- Rendering or caching page body.
- Circumventing login, paywalls, CAPTCHAs, or anti-bot systems.
- Multi-source scraping beyond search-result pages.
- Browser automation as the normal search path.

## User Experience

The page starts as a compact tool:

1. User enters a title and chapter.
2. User clicks `搜索候选`.
3. The page shows loading state.
4. Results appear as cards with:
   - candidate title
   - domain
   - snippet
   - match badges
   - relevance score
   - open button
5. If no candidates or the search request fails, the page shows fallback search-engine links.

The current recent-record workflow stays:

- Save title/chapter.
- Paste a known chapter link.
- Reopen it later.

## Architecture

Use a small dependency-light Node project:

- `server.js`: HTTP server, static file serving, API route.
- `src/search-service.js`: input normalization, query building, DuckDuckGo fetch, result parsing, scoring, and response shaping.
- `test/search-service.test.js`: unit tests for query building, parsing, scoring, and validation.
- `index.html`: front-end UI and client logic.

DuckDuckGo is used through its HTML endpoint as the first search source because it can return regular HTML without an API key. If it fails, the server returns a structured error and the UI falls back to manual search links.

## API

`GET /api/search?title=重生2014我刑侦之王&chapter=668`

Success response:

```json
{
  "query": "重生2014我刑侦之王 第668章",
  "results": [
    {
      "title": "重生2014我刑侦之王 第668章 ...",
      "url": "https://example.com/chapter.html",
      "domain": "example.com",
      "snippet": "搜索结果摘要",
      "score": 85,
      "badges": ["名称命中", "章节命中"]
    }
  ],
  "fallbackLinks": []
}
```

Validation error response:

```json
{
  "error": "INVALID_INPUT",
  "message": "名称和章节必填，章节必须是正整数。"
}
```

Search failure response:

```json
{
  "error": "SEARCH_FAILED",
  "message": "搜索暂时不可用，请使用备用搜索入口。",
  "fallbackLinks": []
}
```

## Ranking

Scoring rules:

- Title contains the full normalized book title: +45.
- Title or snippet contains `第<chapter>章`: +35.
- Title or snippet contains `<chapter>章`: +25.
- Title contains the chapter number: +10.
- Snippet contains the book title: +15.
- URL contains chapter number: +5.

Results with identical URLs are deduplicated. Results sort by score descending, then original order.

## Error Handling

- Empty title or invalid chapter returns `INVALID_INPUT`.
- Search timeout returns `SEARCH_FAILED`.
- Parser returns an empty list if markup changes.
- Front-end keeps fallback links available when API search fails or returns no results.
- Server must not proxy candidate chapter pages.

## Testing

Automated:

- Query builder creates the expected chapter query.
- DuckDuckGo parser extracts title, URL, snippet, and domain from fixture HTML.
- Scoring ranks a strong chapter match above a weak generic match.
- Validation rejects empty title and non-positive chapters.

Manual:

- `npm test` passes.
- `npm start` serves the page.
- Searching `重生2014我刑侦之王` chapter `668` returns either candidates or a clear fallback message.
- Candidate links open directly in new tabs.
- No code path fetches candidate chapter page content.
