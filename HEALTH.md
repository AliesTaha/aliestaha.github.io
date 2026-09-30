# Public health dashboard

The Health link on the homepage opens `/health/`. The page reads only
`assets/data/health.json`, a deliberately public daily summary from the owner's
WHOOP account. It uses the site's Jekyll layout and local CSS/JavaScript; there
are no browser API credentials, external chart libraries, or health analytics
trackers.

## Public data

The snapshot contains daily sleep duration and stages, sleep scores and debt,
HRV, resting/average/maximum heart rate, recovery, strain, respiratory rate,
blood oxygen, skin temperature, workout counts and elapsed minutes, steps,
and energy expenditure when WHOOP supplies them. Missing values remain null.
The page reports age 22 as self-reported in September 2026; it does not invent
a biological-age value or continuous heart-rate samples.

Only daily dates are published. Account identifiers, exact sleep and workout
timestamps, individual workout details, profile information, weight, raw API
records, and credentials are excluded. Published snapshots are public and
remain in Git history; stopping future updates does not erase prior copies.

The D/W/M/Y/ALL controls show 1/7/30/365/all calendar days ending on the latest
recorded day. D is a single daily observation. Gaps stay visible. Latest cards
show each metric's own measurement date. Range summaries weight each observed
day equally. Open-cycle measurements can change as WHOOP syncs.

Sleep, recovery, and cycle metrics use the associated main sleep's local wake
date, with a disclosed cycle-start fallback when no main sleep is available.
If cycles share a date, a cycle with main sleep takes priority, then the latest
cycle. Strain is never summed. Workouts use their local start date. Detailed
definitions and quality counts travel with the snapshot.

## Local refresh and publication

The owner chose an hourly Codex heartbeat on their Mac. Codex must be running
and the Mac awake and online for scheduled refreshes. The public site remains
available independently. After three hours without a successful data fetch,
the page labels its last publication stale and keeps the last good charts.
An open browser tab checks for a new snapshot every five minutes while visible
and when returning to the tab, preserving the selected metric and range.

The local installation is outside this repository at
`~/.local/share/whoop-codex/`. Its virtual environment and authenticated
connector are prerequisites, as is an authenticated GitHub CLI with repository
write access. OAuth credentials remain under `~/.whoop-mcp/`.

From this checkout, a refresh that validates but does not publish is:

```sh
~/.local/share/whoop-codex/.venv/bin/python scripts/refresh_health.py
```

To publish the validated result:

```sh
~/.local/share/whoop-codex/.venv/bin/python scripts/refresh_health.py --publish
```

The runner locks against overlapping runs, fetches into a private local cache,
and invokes a strict allowlist validator. The publisher updates only
`assets/data/health.json` on `AliesTaha/aliestaha.github.io:main` through the
GitHub Contents API. GitHub Pages then rebuilds the site, which can add several
minutes to the visible refresh. The hourly runner does not alter the checkout.
It refuses to replace a newer public snapshot or publish unrecognized fields.
Failed refreshes leave the published snapshot in place.

The first fetch and weekly refreshes paginate all available WHOOP history.
Other runs replace the latest 30-day window, including rescored or deleted
records. Raw history is stored only in the private local cache with directory
mode 700 and file mode 600. `export_whoop.py --offline` rebuilds from the cache
without advancing freshness; `--full` forces a full download.

Pause or delete the **Refresh public WHOOP health** automation in Codex to stop
future updates. Revoke the integration in WHOOP to stop API access. Keep the
local checkout and private connector installation in place while using the
automation.

## Validation

```sh
~/.local/share/whoop-codex/.venv/bin/python -m pytest tests -q
node --test tests/health.test.js
bundle exec jekyll build
```

The tests cover date alignment, missing data, partial scoring, pagination,
incremental replacement, public-field restrictions, publication concurrency,
stale-snapshot rejection, chart windows, gaps, and freshness. `scripts/`,
`tests/`, and this operational document are excluded from the generated site.
