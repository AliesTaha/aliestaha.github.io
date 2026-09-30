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
Each chart also shows a dashed exponential moving average: 3 days for Week,
7 for Month, and 14 for All. EMA is calculated over the full available history
before clipping to the visible range, seeded with the first observed value.
Its daily weight is `2 / (span + 1)`; after a gap of `d` calendar days since the
last observation, the next observation receives weight `1 - (1 - alpha)^d`.
Missing measurements remain gaps and are never treated as zero.

The signed ticker at each chart's top compares the first visible EMA with the
last visible EMA: `100 * (end - start) / abs(start)`. Hover compares the selected
day's EMA with the same starting point. At least two measured days are needed;
missing endpoints and a zero baseline followed by a nonzero value show a dash.
An all-zero comparison displays 0.0%. Up and down indicate numerical direction,
not a judgment about whether a health metric is better or worse.

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

The hourly refresh runs directly under macOS `launchd`, without Codex or an AI
session. The per-user LaunchAgent runs at login and at minute 0 of each hour.
Calendar events missed during sleep coalesce into one run when the Mac wakes.
The user must be logged in and the Mac awake and online for a refresh to finish;
the public site remains available independently. After three hours without a
successful data fetch,
the page labels its last publication stale and keeps the last good charts.
An open Body section checks for a new snapshot every five minutes while visible
and when returning to the tab or section, preserving the selected range.

The local installation is outside this repository at
`~/.local/share/whoop-codex/`. Its virtual environment and authenticated
connector are prerequisites, as is an authenticated GitHub CLI with repository
write access. OAuth credentials remain under `~/.whoop-mcp/`.

Install or update the independent scheduler from this checkout:

```sh
~/.local/share/whoop-codex/.venv/bin/python scripts/install_health_agent.py --install
```

This copies the runner, exporter, and publisher into
`~/.local/share/whoop-codex/health-sync/scripts/`, outside the Desktop privacy
boundary, and installs `~/Library/LaunchAgents/com.aliestaha.health-sync.plist`.
The plist contains executable paths and the hourly schedule, never credentials.
The running service no longer depends on the checkout staying in place.
Re-run the installer after changing the refresh scripts to update its copies.
The original Codex heartbeat is paused after an actual LaunchAgent run succeeds,
so the two schedulers do not both perform routine refreshes.

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
Failed fetches and validation leave the published snapshot in place.
The independent scheduled wrapper captures child output privately and waits for
a successful Pages build plus the matching live publication timestamp before
recording success. Its `scheduled-status.json` and sanitized, rotated
`scheduled.log` live in the private `health-cache` directory. Deployment checks
have a bounded retry window; a
deployment failure is recorded separately from a verified successful update.

The first fetch and weekly refreshes paginate all available WHOOP history.
Other runs replace the latest 30-day window, including rescored or deleted
records. Raw history is stored only in the private local cache with directory
mode 700 and file mode 600. `export_whoop.py --offline` rebuilds from the cache
without advancing freshness; `--full` forces a full download.

Inspect the background service with:

```sh
launchctl print gui/$(id -u)/com.aliestaha.health-sync
cat ~/.local/share/whoop-codex/health-cache/scheduled-status.json
```

To stop future updates, disable and unload it:

```sh
launchctl disable gui/$(id -u)/com.aliestaha.health-sync
launchctl bootout gui/$(id -u)/com.aliestaha.health-sync
```

Run the installer again to re-enable it. Revoke the integration in WHOOP to stop
API access. Keep the private connector and `health-sync` installation in place.
Closing Codex has no effect on this service; signing out of macOS or shutting
down the Mac stops it until the next login. This is a Mac-hosted service, not a
cloud-hosted scheduler.

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
