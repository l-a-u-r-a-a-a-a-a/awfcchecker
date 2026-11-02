# hasreneeresignedyet

Static site showing YES/NO for whether Renée Slegers has left Arsenal Women, plus WSL and UWCL standings.

- `index.html` renders `data.json`.
- `scripts/update.mjs` refreshes `data.json` (Wikipedia infobox for the coach, ESPN for standings). A self-restarting GitHub Action runs it every ~10 minutes (each run waits, then starts the next; the cron schedule is a backup) and commits each check (`checkedAt`; `updatedAt` only moves when the data changes).
- To force the answer, set `"gone": true` or `false` in `override.json` (`null` = automatic).

Hosting: enable GitHub Pages (Settings -> Pages -> deploy from branch, root), then point the domain at it with a `CNAME` file.
- `scripts/news.mjs` scans Google News and BBC Sport headlines for possible Slegers exit stories. It never changes the answer; it opens a GitHub issue (which emails the repo owner) so a human can decide. Wikipedia remains the only automatic trigger.
