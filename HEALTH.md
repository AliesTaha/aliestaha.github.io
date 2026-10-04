# WHOOP updater

Body reads `assets/data/health.json`. The public snapshot contains approved daily measurements, never credentials, account identifiers, raw records, or exact sleep/workout timestamps. Missing values remain null. Previous snapshots remain in Git history.

Six charts show sleep score, recovery, strain, resting heart rate, workout time, and steps. Week/Month/All uses 7/30/all calendar days. Numbers show daily averages, except resting heart rate, which shows the latest reading. Hover shows a day's value. Dashed EMA spans are 3/7/14 days; lower resting heart rate counts as an improvement. The animated heart follows the last recorded BPM, not a live signal.

## Automatic refresh

The macOS LaunchAgent `com.aliestaha.health-sync` checks each minute and refreshes hourly, after waking, or five minutes after a failure. The Mac must be awake, online, and logged in. Closing Codex has no effect. The dashboard keeps the last good data and marks it stale after three hours.

The installed runtime is `~/.local/share/whoop-codex/health-sync/`. Credentials stay under `~/.whoop-mcp/`. The checkout can move without stopping the service.

Install or update the service after changing its scripts:

```sh
~/.local/share/whoop-codex/.venv/bin/python scripts/install_health_agent.py --install
```

Manual refresh and publication:

```sh
~/.local/share/whoop-codex/.venv/bin/python scripts/refresh_health.py --publish
```

Omit `--publish` to validate without publishing. The runner locks against overlap; the publisher validates allowed fields and updates only `assets/data/health.json`. Failed fetches or validation preserve the last public snapshot. A scheduled run records success only after the Pages build succeeds and the live snapshot matches.

## Troubleshooting

```sh
launchctl print gui/$(id -u)/com.aliestaha.health-sync
cat ~/.local/share/whoop-codex/health-cache/scheduled-status.json
```

Sanitized logs are in the same private cache directory. If status reports `whoop_auth_failed`, reconnect:

```sh
~/.local/share/whoop-codex/.venv/bin/python ~/.local/share/whoop-codex/whoop_mcp_server.py auth
```

Complete sign-in on WHOOP's browser page. The next attempt uses the new tokens.

To stop the service:

```sh
launchctl disable gui/$(id -u)/com.aliestaha.health-sync
launchctl bootout gui/$(id -u)/com.aliestaha.health-sync
```

Run the installer to re-enable it. Revoke the integration in WHOOP to stop API access.
