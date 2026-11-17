# Repository guidance

- `README.md` is the public site's homepage. Treat changes to it as public-facing content; do not add technical documentation or make incidental edits.
- The weekly devlog workflow writes articles to `blog/`, and requires GitHub Pages to use GitHub Actions as its source and Actions to have contents write access.
- Run `npm ci` and `npm test` to check the devlog generator. Locally, `npm run devlog` uses `GITHUB_TOKEN` and `COPILOT_GITHUB_TOKEN` when set, otherwise it gets the missing tokens from an authenticated `gh` CLI. The Copilot token must have Copilot access. For Actions, add a fine-grained token with Copilot Requests permission as the `COPILOT_GITHUB_TOKEN` secret. Copilot requests may incur charges.
- The GitHub public events feed contains at most 300 events; the workflow logs a warning if activity may be incomplete.
