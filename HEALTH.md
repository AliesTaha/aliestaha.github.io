# Public health dashboard

The homepage is titled "Mind, Body, Soul" and has Mind (technical posts), Body
(health), and Soul (personal posts) sections beneath one shared intro. Soul
opens at `/#soul`; legacy `/#heart` and `/#personal` links select Soul. Body
opens in place at `/#body`; legacy `/health/` links redirect there. The dashboard reads only
`assets/data/health.json`, a deliberately public daily summary from the owner's
WHOOP account. It uses the site's Jekyll layout and local CSS/JavaScript; there
are no browser API credentials, external chart libraries, or health analytics
trackers.

## Public data

The snapshot contains daily sleep duration and stages, sleep scores and debt,
HRV, resting/average/maximum heart rate, recovery, strain, respiratory rate,
blood oxygen, skin temperature, workout counts and elapsed minutes, steps,
and energy expenditure when WHOOP supplies them. Missing values remain null.
Biological age and continuous heart-rate samples are not supplied by the API.

Only daily dates are published. Account identifiers, exact sleep and workout
timestamps, individual workout details, profile information, weight, raw API
records, and credentials are excluded. Published snapshots are public and
remain in Git history; stopping future updates does not erase prior copies.

The public interface shows six fixed charts around a line-art figure: sleep
score at the head, recovery at the neck, daily strain at the bicep, resting
heart rate at the heart, workout time at the knee, and steps at the foot.
Sleep score uses WHOOP's
`sleep_performance_percentage`. There is no metric selector.

One Week/Month/All control updates all six charts, using 7/30/all calendar days
ending on the latest recorded day. Five prominent numbers are the selected
range's daily averages, weighting observed days equally and excluding nulls.
Resting heart rate displays the latest valid recorded reading and its date,
while its chart shows the selected range's history. The heart animates at that
exact reading: one beat every 60 / BPM seconds. It represents a recorded pulse,
not a live measurement. The animation pauses when Body or the browser tab is
hidden, and is disabled for visitors who prefer reduced motion.
Missing days remain gaps. Open-cycle measurements can change as WHOOP syncs.
Hovering a chart highlights the nearest calendar day and temporarily replaces
its prominent number with that day's measurement and date. Missing measurements
show a dash. Leaving the chart restores its range average or latest recorded
resting heart rate. Week shows a dot for every measured day; Month and All show
the selected point. Keyboard arrows and touch also support daily inspection.
The decorative heartbeat continues to use the latest recorded resting heart rate.
The dashboard uses the site's cream background, serif numbers, and brown/gold
accents. The portrait combines a generated brown contour illustration of the
owner in a classic bodybuilding pose with decorative SVG connectors and an
animated heart. Each chart has its own readable label and accessible description.
The illustration brief is recorded in `scripts/design/body-portrait-prompts.md`.

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
An open Body section checks for a new snapshot every five minutes while visible
and when returning to the tab or section, preserving the selected range.

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
