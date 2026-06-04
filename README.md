# navel-tool

A tiny local chapter navigation helper.

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

The tool stores recent records and user-pasted chapter shortcuts in browser `localStorage`. It handles search-result metadata and links only; it does not fetch, render, cache, or download page text.
