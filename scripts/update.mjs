// Fetches coach status + standings and writes data.json. Run: node scripts/update.mjs
import { readFile, writeFile } from "node:fs/promises";

const ESPN = "https://site.api.espn.com/apis/v2/sports/soccer";
const LEAGUES = { wsl: "eng.w.1", ucl: "uefa.wchampions" };
const UA = { "User-Agent": "hasreneeresignedyet (github.com/l-a-u-r-a-a-a-a-a/awfcchecker)" };

const prev = JSON.parse(await readFile("data.json", "utf8").catch(() => "{}"));
const override = JSON.parse(await readFile("override.json", "utf8").catch(() => "{}"));

async function getJson(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// YES/NO: is Renée Slegers no longer listed as manager on Wikipedia's Arsenal W.F.C. infobox?
async function coachStatus() {
  const j = await getJson(
    "https://en.wikipedia.org/w/api.php?action=parse&page=Arsenal_W.F.C.&prop=wikitext&section=0&format=json&formatversion=2"
  );
  const m = j.parse.wikitext.match(/\|\s*manager\s*=\s*(.+)/i);
  const listed = m ? m[1].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").trim() : null;
  if (!listed) throw new Error("manager field not found");
  return { gone: !/slegers/i.test(listed), listedCoach: listed };
}

async function standing(code) {
  const j = await getJson(`${ESPN}/${code}/standings`);
  const groups = j.children?.length ? j.children : [j];
  for (const g of groups) {
    const entries = g.standings?.entries ?? [];
    const e = entries.find((x) => /arsenal/i.test(x.team?.displayName ?? ""));
    if (!e) continue;
    const s = Object.fromEntries(e.stats.map((x) => [x.name, x.value]));
    return {
      teamId: e.team.id,
      competition: j.name ?? code,
      group: groups.length > 1 ? g.name : null,
      position: s.rank,
      of: entries.length,
      played: s.gamesPlayed,
      won: s.wins,
      drawn: s.ties,
      lost: s.losses,
      gd: s.pointDifferential,
      points: s.points,
      season: j.seasons?.[0]?.displayName ?? g.standings?.seasonDisplayName ?? null,
    };
  }
  return null; // Arsenal not in this competition / not started
}

// Completed matches for Arsenal in one competition, oldest first.
async function results(code, teamId) {
  const j = await getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/teams/${teamId}/schedule`);
  const score = (c) => Number(typeof c.score === "object" ? c.score?.value ?? c.score?.displayValue : c.score);
  return (j.events ?? [])
    .map((ev) => {
      const comp = ev.competitions?.[0];
      if (!comp?.status?.type?.completed && !ev.status?.type?.completed) return null;
      const us = comp.competitors.find((c) => String(c.team?.id) === String(teamId));
      const them = comp.competitors.find((c) => c !== us);
      if (!us || !them) return null;
      const f = score(us), a = score(them);
      if (Number.isNaN(f) || Number.isNaN(a)) return null;
      return {
        date: ev.date,
        opponent: them.team.displayName,
        home: us.homeAway === "home",
        for: f,
        against: a,
        result: f > a ? "W" : f < a ? "L" : "D",
      };
    })
    .filter(Boolean)
    .sort((x, y) => x.date.localeCompare(y.date));
}

const out = { ...prev };
try { Object.assign(out, await coachStatus(), { coachCheckedAt: new Date().toISOString() }); }
catch (e) { console.error("coach:", e.message); }
for (const [key, code] of Object.entries(LEAGUES)) {
  try { out[key] = await standing(code); } catch (e) { console.error(key + ":", e.message); }
  try { if (out[key]?.teamId) out[key].matches = await results(code, out[key].teamId); }
  catch (e) { console.error(key + " matches:", e.message); }
}
if (typeof override.gone === "boolean") out.gone = override.gone;
out.updatedAt = new Date().toISOString();

await writeFile("data.json", JSON.stringify(out, null, 2) + "\n");
console.log(out);
