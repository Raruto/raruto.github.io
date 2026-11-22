# Repository guidance

## Protected files & structure
- **`README.md`:** Public homepage. Edit only what is explicitly requested; never alter formatting, links, or add technical docs.
- **Read-only directories:** Never modify, add, remove, or move files in `cdn/`, `static/examples/` or `static/img/`.
- **Editable sources:** Only edit `_posts/`, `index.html` and `thank-you.md`. Builds output to `static/` while preserving the read-only directories above.

## Commands
- `npm ci` — Install dependencies.
- `npm test` — Run tests for the site builder and devlog generator.
- `npm run build` — Build static site into `static/`.
- `npm run dev` — Serve locally at `http://127.0.0` with auto-rebuild.
- `npm run devlog` — Update monthly devlogs (requires `GITHUB_TOKEN` and `COPILOT_GITHUB_TOKEN` with Copilot access, or an authenticated `gh` CLI; abort without writing if missing).

## Blog & devlog rules
- **Guidelines:** Follow `.github/instructions/blog.instructions.md` for all articles.
- **Routing & metadata:** Keep URLs at `/blog/<filename>.html` and archive at `_posts/index.md`. Keep navigation/breadcrumbs independent of post bodies.
- **Monthly devlogs:** Start with a descriptive title and `Devlog: YYYY-MM`. You may reference existing `static/img/` files.
- **Privacy & safety:** Store normalized public activity in `activity` front matter. Strip private repo names, secrets, tokens, and non-public personal data before saving.