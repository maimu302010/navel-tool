# Novel Chapter Navigator Design

## Goal

Build a small local web tool for quickly locating candidate search results for a novel chapter. The tool helps the user enter a book title and chapter number, generate useful search links, and keep lightweight reading shortcuts.

The tool is a navigator, not a content scraper. It must not fetch, display, download, cache, or redistribute novel chapter text.

## Scope

First version:

- Provide a local `index.html` that can be opened directly in a browser.
- Accept a book title and chapter number.
- Generate several query variants, including:
  - `<book title> 第<chapter>章`
  - `<book title> <chapter>章`
  - `<book title> 最新章节 <chapter>`
- Show search-engine entry buttons for each query.
- Support opening all generated search links.
- Save recent records in browser `localStorage`.
- Let the user paste a known chapter URL into a saved record and open it later.

Out of scope:

- Automatically scraping search result pages.
- Fetching chapter pages.
- Rendering novel正文 inside the tool.
- Circumventing login, paywalls, access controls, or anti-bot systems.
- Batch downloading or archiving chapters.

## User Experience

The page should feel like a compact utility rather than a landing page. The first screen is the usable search form.

Primary workflow:

1. User enters a book title, for example `重生2014我刑侦之王`.
2. User enters a chapter number, for example `668`.
3. User clicks generate.
4. The page shows query variants and search engine buttons.
5. User opens one or more search links in browser tabs.
6. User can save the book/chapter as a recent record.
7. If the user finds a working chapter link, they can paste it into the record for future one-click access.

The interface should avoid visible explanations about copyright or implementation details. The boundary is enforced by behavior: the tool only generates/open links and stores user-provided shortcuts.

## Architecture

Use a single static HTML file with embedded CSS and JavaScript.

Modules inside the script:

- State management: current title, chapter, generated queries, recent records.
- Query builder: normalizes input and creates query variants.
- Search provider builder: maps each query to search URLs.
- Storage adapter: reads/writes recent records from `localStorage`.
- UI renderer: updates generated links and recent records.

This keeps the first version dependency-free and easy to run.

## Data Model

Recent records are stored as JSON in `localStorage` under one stable key.

Each record:

```json
{
  "id": "timestamp-or-random-id",
  "title": "重生2014我刑侦之王",
  "chapter": "668",
  "chapterUrl": "",
  "updatedAt": "2026-06-04T00:00:00.000Z"
}
```

Records are ordered by `updatedAt` descending. Duplicate title/chapter pairs update the existing record instead of creating a duplicate.

## Search Providers

The first version should include search URLs for common engines that work from a normal browser:

- Bing
- Baidu
- Sogou
- 360 Search

The provider list should be a small data array so adding or removing engines is straightforward.

## Error Handling

- If title is empty, show a field-level validation state and do not generate links.
- If chapter is empty or not a positive integer, show a field-level validation state and do not generate links.
- If `localStorage` fails, keep the page usable for the current session and show a compact non-blocking message.
- If a pasted chapter URL is invalid, keep the old value and show validation near that record.

## Testing

Manual checks are enough for the first version:

- Opening the file directly in a browser displays the tool.
- `重生2014我刑侦之王` + `668` generates expected query variants.
- Search buttons open encoded URLs.
- Recent records persist after refresh.
- Duplicate save updates the old record.
- Invalid input does not generate broken links.
- The page never displays fetched novel content.
