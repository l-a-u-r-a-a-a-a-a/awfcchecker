// Scans news headlines for possible Slegers exit stories. Never changes the YES/NO answer;
// writes new matches to news-alert.md so the workflow can open a GitHub issue (which emails the repo owner).
import { readFile, writeFile } from "node:fs/promises";

const FEEDS = [
  "https://news.google.com/rss/search?q=%22Slegers%22&hl=en-GB&gl=GB&ceid=GB:en",
  "https://feeds.bbci.co.uk/sport/football/womens/rss.xml",
  "https://feeds.bbci.co.uk/sport/football/teams/arsenal/rss.xml",
];
const EXIT = /\b(sack(ed|ing|s)?|axed|fired|dismiss(ed|al)|leav(e|es|ing)|left|depart(s|ed|ure)?|exit(s|ed)?|resign(s|ed|ation)?|step(s|ped)? down|quit(s)?|part(s|ed)? (ways|company)|replace(d|ment)?|successor|interim|new (head )?coach|under pressure|future)\b/i;
const MAX_AGE_MS = 3 * 24 * 3600 * 1000;

const seen = new Set(JSON.parse(await readFile("news-seen.json", "utf8").catch(() => "[]")));
const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (item, name) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "");

const hits = [];
for (const url of FEEDS) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "hasreneeresignedyet" } });
    if (!r.ok) throw new Error(r.status);
    const xml = await r.text();
    for (const [item] of xml.matchAll(/<item>[\s\S]*?<\/item>/g)) {
      const title = tag(item, "title"), desc = tag(item, "description").replace(/<[^>]+>/g, " ");
      const link = tag(item, "link"), date = new Date(tag(item, "pubDate"));
      const text = `${title} ${desc}`;
      if (!/slegers/i.test(text) || !EXIT.test(text)) continue;
      if (Date.now() - date > MAX_AGE_MS) continue;
      const key = title.toLowerCase().replace(/\W+/g, " ").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ title, link, date });
    }
  } catch (e) { console.error("news:", url, e.message); }
}

if (hits.length) {
  await writeFile("news-seen.json", JSON.stringify([...seen].slice(-500), null, 2) + "\n");
  await writeFile("news-alert.md",
    "Possible Renée Slegers news. The site has NOT changed. Check the stories and, if she's gone, set `\"gone\": true` in `override.json` (or ask Claude to).\n\n" +
    hits.map((h) => `- [${h.title}](${h.link}) (${h.date.toUTCString()})`).join("\n") + "\n");
  console.log(`${hits.length} new headline(s)`);
} else console.log("No new headlines");
