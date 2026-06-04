import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildChapterQuery,
  normalizeChapter,
  normalizeTitle,
  parseBaiduResults,
  parseBingResults,
  parseDuckDuckGoResults,
  parseSoResults,
  scoreResult,
  searchCandidates,
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

const bingFixtureHtml = `
<html>
  <body>
    <ol id="b_results">
      <li class="b_algo">
        <h2><a href="https://example.com/book/668.html">重生2014我刑侦之王 第668章 真相</a></h2>
        <p>重生2014我刑侦之王 最新章节 第668章 搜索摘要</p>
      </li>
      <li class="b_algo">
        <h2><a href="https://other.example/search">重生2014我刑侦之王 小说目录</a></h2>
        <p>目录和章节列表</p>
      </li>
    </ol>
  </body>
</html>
`;

const soFixtureHtml = `
<html>
  <body>
    <li class="res-list">
      <h3><a href="https://www.so.com/link?m=abc">重生2014:我,刑侦之王 - 正文 第六百六十八章 捆人也是有技巧的</a></h3>
      <p>《重生2014:我,刑侦之王》正文 第六百六十八章 捆人也是有技巧的 kanletao.com反馈</p>
    </li>
  </body>
</html>
`;

const baiduFixtureHtml = `
<html>
  <body>
    <div class="result c-container">
      <h3><a href="http://www.baidu.com/link?url=abc">重生2014:我,刑侦之王在线阅读 | 最新章节目录_笔趣阁</a></h3>
      <div class="c-abstract">最新章节：第668章 捆人也是有技巧的 www.example.com/list</div>
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

  it("parses Bing result HTML", () => {
    const results = parseBingResults(bingFixtureHtml);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, "重生2014我刑侦之王 第668章 真相");
    assert.equal(results[0].url, "https://example.com/book/668.html");
    assert.equal(results[0].domain, "example.com");
    assert.equal(results[0].snippet, "重生2014我刑侦之王 最新章节 第668章 搜索摘要");
  });

  it("parses 360 result HTML", () => {
    const results = parseSoResults(soFixtureHtml);
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "重生2014:我,刑侦之王 - 正文 第六百六十八章 捆人也是有技巧的");
    assert.equal(results[0].url, "https://www.so.com/link?m=abc");
    assert.equal(results[0].domain, "so.com");
    assert.match(results[0].snippet, /第六百六十八章/);
  });

  it("parses Baidu result HTML", () => {
    const results = parseBaiduResults(baiduFixtureHtml);
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "重生2014:我,刑侦之王在线阅读 | 最新章节目录_笔趣阁");
    assert.equal(results[0].url, "http://www.baidu.com/link?url=abc");
    assert.equal(results[0].domain, "baidu.com");
    assert.match(results[0].snippet, /第668章/);
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

  it("scores Chinese-number chapter matches", () => {
    const result = scoreResult({
      title: "重生2014:我,刑侦之王 - 正文 第六百六十八章 捆人也是有技巧的",
      snippet: "重生2014:我,刑侦之王 正文 第六百六十八章",
      url: "https://example.com/chapter"
    }, "重生2014我刑侦之王", "668");

    assert.ok(result.score >= 80);
    assert.ok(result.badges.includes("章节命中"));
  });

  it("filters search results without book-title relevance", async () => {
    const fetchImpl = async () => ({
      ok: true,
      text: async () => bingFixtureHtml.replaceAll("重生2014我刑侦之王", "无关电影")
    });

    const response = await searchCandidates({
      title: "重生2014我刑侦之王",
      chapter: "668",
      fetchImpl
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.results, []);
  });
});
