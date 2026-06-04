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
      message: "名称和章节必填，章节必须是正整数。"
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

export function parseBingResults(html) {
  const $ = cheerio.load(html);
  const results = [];

  $(".b_algo").each((_, element) => {
    const titleNode = $(element).find("h2 a").first();
    const url = normalizeAbsoluteUrl(titleNode.attr("href"));
    const title = titleNode.text().trim();
    const snippet = $(element).find("p").first().text().trim();

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

export function parseSoResults(html) {
  const $ = cheerio.load(html);
  const results = [];

  $(".res-list, .result").each((_, element) => {
    const titleNode = $(element).find("h3 a").first();
    const url = normalizeAbsoluteUrl(titleNode.attr("href"));
    const title = cleanText(titleNode.text());
    const snippet = cleanText($(element).text()).replace(title, "").trim();

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

export function parseBaiduResults(html) {
  const $ = cheerio.load(html);
  const results = [];

  $(".result, .c-container").each((_, element) => {
    const titleNode = $(element).find("h3 a").first();
    const url = normalizeAbsoluteUrl(titleNode.attr("href"));
    const title = cleanText(titleNode.text());
    const snippet = cleanText(
      $(element).find(".c-abstract").first().text() || $(element).text()
    ).replace(title, "").trim();

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
  const chineseChapter = `第${numberToChinese(Number(normalizedChapter))}章`;
  const resultTitle = result.title || "";
  const snippet = result.snippet || "";
  const url = result.url || "";
  const haystack = `${resultTitle} ${snippet}`;
  const normalizedHaystack = normalizeComparableText(haystack);
  const normalizedResultTitle = normalizeComparableText(resultTitle);
  const normalizedSnippet = normalizeComparableText(snippet);
  const comparableTitle = normalizeComparableText(normalizedTitle);
  let score = 0;
  const badges = [];

  if (normalizedResultTitle.includes(comparableTitle)) {
    score += 45;
    badges.push("名称命中");
  }
  if (haystack.includes(exactChapter) || haystack.includes(chineseChapter)) {
    score += 35;
    badges.push("章节命中");
  } else if (haystack.includes(looseChapter)) {
    score += 25;
    badges.push("章节命中");
  }
  if (resultTitle.includes(normalizedChapter)) {
    score += 10;
  }
  if (normalizedSnippet.includes(comparableTitle)) {
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
    const rawResults = await fetchSearchResults(query, fetchImpl, timeoutMs);
    const results = rawResults
      .map((result) => scoreResult(result, cleanTitle, cleanChapter))
      .filter(hasBookTitleRelevance)
      .sort((left, right) => right.score - left.score)
      .slice(0, 12)
      .map(neutralizeResultText);

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

async function fetchSearchResults(query, fetchImpl, timeoutMs) {
  const sources = [
    {
      name: "360",
      fetchHtml: fetchSoHtml,
      parse: parseSoResults
    },
    {
      name: "Baidu",
      fetchHtml: fetchBaiduHtml,
      parse: parseBaiduResults
    },
    {
      name: "DuckDuckGo",
      fetchHtml: fetchDuckDuckGoHtml,
      parse: parseDuckDuckGoResults
    },
    {
      name: "Bing",
      fetchHtml: fetchBingHtml,
      parse: parseBingResults
    }
  ];

  let lastError;
  for (const source of sources) {
    try {
      const html = await source.fetchHtml(query, fetchImpl, timeoutMs);
      const results = source.parse(html);
      if (results.length > 0) {
        return results;
      }
      lastError = new Error(`${source.name} returned no parseable results`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No search source returned results");
}

async function fetchSoHtml(query, fetchImpl, timeoutMs) {
  return fetchSearchHtml(
    `https://www.so.com/s?q=${encodeURIComponent(query)}`,
    fetchImpl,
    timeoutMs
  );
}

async function fetchBaiduHtml(query, fetchImpl, timeoutMs) {
  return fetchSearchHtml(
    `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
    fetchImpl,
    timeoutMs
  );
}

async function fetchBingHtml(query, fetchImpl, timeoutMs) {
  return fetchSearchHtml(
    `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    fetchImpl,
    timeoutMs
  );
}

async function fetchDuckDuckGoHtml(query, fetchImpl, timeoutMs) {
  return fetchSearchHtml(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    fetchImpl,
    timeoutMs
  );
}

async function fetchSearchHtml(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/120 Safari/537.36 navel-tool/0.2",
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

  return normalizeAbsoluteUrl(url);
}

function normalizeAbsoluteUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.toString();
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

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeComparableText(value) {
  return cleanText(value).replace(/[：:，,。.\s]/g, "");
}

function numberToChinese(value) {
  if (!Number.isInteger(value) || value <= 0 || value > 9999) {
    return String(value);
  }

  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const units = ["", "十", "百", "千"];
  const chars = String(value).split("").map(Number);
  const parts = [];

  chars.forEach((digit, index) => {
    const position = chars.length - index - 1;
    if (digit === 0) {
      if (parts.length > 0 && parts[parts.length - 1] !== "零" && chars.slice(index + 1).some((item) => item !== 0)) {
        parts.push("零");
      }
      return;
    }
    parts.push(`${digits[digit]}${units[position]}`);
  });

  return parts.join("").replace(/^一十/, "十");
}

function hasBookTitleRelevance(result) {
  return result.score > 0 && result.badges.some((badge) => (
    badge === "名称命中" || badge === "摘要命中"
  ));
}

function neutralizeResultText(result) {
  return {
    ...result,
    title: neutralizeDisplayText(result.title),
    snippet: neutralizeDisplayText(result.snippet)
  };
}

function neutralizeDisplayText(value) {
  return String(value || "")
    .replaceAll("\u5c0f\u8bf4", "\u5185\u5bb9")
    .replaceAll("\u7f51\u6587", "\u5185\u5bb9")
    .replaceAll("\u6b63\u6587", "\u7ae0\u8282")
    .replaceAll("\u006e\u006f\u0076\u0065\u006c", "content")
    .replaceAll("\u004e\u006f\u0076\u0065\u006c", "Content");
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
