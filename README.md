# hasreneeresignedyet

Static site showing YES/NO for whether Renée Slegers has left Arsenal Women, plus WSL and UWCL standings.

- `index.html` renders `data.json`.
- `scripts/update.mjs` refreshes `data.json` (Wikipedia infobox for the coach, ESPN for standings). A GitHub Action runs it hourly and commits changes.
- To force the answer, set `"gone": true` or `false` in `override.json` (`null` = automatic).

Hosting: enable GitHub Pages (Settings -> Pages -> deploy from branch, root), then point the domain at it with a `CNAME` file.
