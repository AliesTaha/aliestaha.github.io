#!/usr/bin/env python3
"""Refresh and verify the public health snapshot without an open Codex app.

The launchd entry point takes no arguments. Child output stays in memory; only
fixed status fields and public publication identifiers reach the private logs.
"""
from __future__ import annotations

from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import ssl
import subprocess
import sys
import tempfile
import time
from urllib import error, request
from urllib.parse import urlsplit


CACHE = Path.home() / ".local/share/whoop-codex/health-cache"
REPOSITORY = "AliesTaha/aliestaha.github.io"
WORKFLOW = "pages build and deployment"
PUBLIC_URL = "https://alibytes.com/assets/data/health.json"
TOTAL_TIMEOUT = 600
POLL_SECONDS = 15
REFRESH_SECONDS = 3600
RETRY_SECONDS = 300
WAKE_SETTLE_SECONDS = 30
LOG_LIMIT = 64 * 1024
MAX_RESPONSE = 8 * 1024 * 1024
ERRORS = {
    "whoop_auth_failed": "WHOOP rejected the saved authorization. Reconnect WHOOP using the local authorization helper; waiting or reopening Codex will not repair it.",
    "whoop_rate_limited": "WHOOP limited requests. The native scheduler will retry after five minutes.",
    "whoop_unavailable": "WHOOP is temporarily unavailable. The native scheduler will retry after five minutes.",
    "network_unavailable": "The network request failed. The native scheduler will retry after five minutes while the Mac is awake.",
    "export_failed": "WHOOP export failed before publication. Check the local connector and cache; the previous public snapshot is preserved.",
    "publication_failed": "The snapshot could not be published. Check GitHub authentication and the public-data validation; the scheduler will retry.",
    "interrupted": "The health runner was stopped before verification completed. The next scheduled run will retry.",
    "refresh_failed": "WHOOP refresh or publication failed. Check WHOOP access, GitHub authentication, and the network; the native scheduler retries after five minutes.",
    "refresh_timeout": "WHOOP refresh exceeded the time limit and was stopped. The native scheduler retries after five minutes.",
    "invalid_publication": "The refresh returned an unexpected publication result. Reinstall the health runner from the site scripts.",
    "github_unavailable": "GitHub deployment verification is unavailable. Check the network and gh auth status.",
    "deployment_failed": "GitHub Pages reported a failed deployment. Inspect the repository's pages build and deployment run.",
    "deployment_timeout": "GitHub Pages did not finish deploying within ten minutes. Check the repository's Actions page.",
    "public_unavailable": "The public health snapshot could not be securely retrieved. Check the website, network, and TLS certificates.",
    "public_snapshot_mismatch": "GitHub Pages succeeded, but the website did not serve this publication timestamp within ten minutes. Check the Pages deployment and cache.",
    "storage_failed": "The health runner could not update its private status files. Check health-cache permissions and free disk space.",
    "unexpected_failure": "The health runner stopped unexpectedly. Reinstall the runner or check the next retry status.",
}


class SyncError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def handle_termination(_signum, _frame):
    # A second stop signal must not interrupt process-group cleanup or status
    # persistence after the first signal has begun controlled cancellation.
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    raise SyncError("interrupted")


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def valid_timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
        return True
    except ValueError:
        return False


def time_left(deadline, code):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise SyncError(code)
    return remaining


def pause(deadline, code):
    time.sleep(min(POLL_SECONDS, time_left(deadline, code)))


def stop_process_group(process):
    """Stop the entire refresh tree, including an in-flight publishing child."""
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        process.communicate(timeout=2)
    except subprocess.TimeoutExpired:
        pass
    finally:
        # A descendant may outlive its parent even if the parent's pipes closed.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.communicate()


def run_command(command, timeout, failure_code, timeout_code):
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   start_new_session=True)
    except OSError:
        raise SyncError(failure_code) from None
    try:
        stdout, _stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        stop_process_group(process)
        raise SyncError(timeout_code) from None
    except BaseException:
        stop_process_group(process)
        raise
    if process.returncode != 0 and failure_code == "refresh_failed" and len(stdout) <= MAX_RESPONSE:
        try:
            result = json.loads(next(line for line in reversed(stdout.decode("utf-8").splitlines()) if line.strip()))
            code = result.get("error", {}).get("code")
            if isinstance(code, str) and code in {"whoop_auth_failed", "whoop_rate_limited", "whoop_unavailable", "network_unavailable", "export_failed", "publication_failed"}:
                raise SyncError(code)
        except (ValueError, UnicodeError, StopIteration, AttributeError):
            pass
    if process.returncode != 0 or len(stdout) > MAX_RESPONSE:
        raise SyncError(failure_code)
    return stdout


def publication_result(output):
    """Only the final nonempty line belongs to the publisher, not the exporter."""
    try:
        lines = output.decode("utf-8").splitlines()
        result = json.loads(next(line for line in reversed(lines) if line.strip()))
        if not isinstance(result, dict):
            raise ValueError
        if result.get("status") == "skipped" and result.get("reason") == "another refresh is running":
            return {"status": "skipped", "reason": "refresh_in_progress"}
        generated = result.get("generated_at")
        if not valid_timestamp(generated):
            raise ValueError
        if result.get("published") is False and result.get("reason") == "already_current":
            return {"status": "skipped", "reason": "already_current", "generated_at": generated}
        commit = result.get("commit")
        if result.get("published") is not True or not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
            raise ValueError
        return {"commit": commit, "generated_at": generated}
    except (ValueError, UnicodeError, StopIteration):
        raise SyncError("invalid_publication") from None


def wait_for_deployment(commit, deadline):
    endpoint = f"repos/{REPOSITORY}/actions/runs?head_sha={commit}&per_page=100"
    last_error = "deployment_timeout"
    while True:
        timeout = min(60, time_left(deadline, last_error))
        try:
            output = run_command(["gh", "api", endpoint, "--header", "Accept: application/vnd.github+json"],
                                 timeout, "github_unavailable", "github_unavailable")
            result = json.loads(output)
            runs = result["workflow_runs"]
            if not isinstance(runs, list):
                raise ValueError
            matching = [run for run in runs if isinstance(run, dict) and run.get("name") == WORKFLOW
                        and run.get("head_sha") == commit and isinstance(run.get("id"), int)]
            if matching:
                latest = max(matching, key=lambda run: (run["id"], run.get("run_attempt", 1)))
                if latest.get("status") == "completed":
                    if latest.get("conclusion") == "success":
                        return
                    raise SyncError("deployment_failed")
            last_error = "deployment_timeout"
        except SyncError as exc:
            if exc.code in ("deployment_failed", "interrupted"):
                raise
            last_error = "github_unavailable"
        except (ValueError, KeyError, TypeError, UnicodeError):
            last_error = "github_unavailable"
        pause(deadline, last_error)


class SecureRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never downgrade TLS or forward this request to an unrelated host.
        target = urlsplit(newurl)
        if target.scheme != "https" or target.netloc != urlsplit(PUBLIC_URL).netloc:
            raise SyncError("public_unavailable")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def public_timestamp(timeout):
    context = ssl.create_default_context()
    opener = request.build_opener(request.HTTPSHandler(context=context), SecureRedirect())
    req = request.Request(PUBLIC_URL, headers={"Cache-Control": "no-cache", "Accept": "application/json"})
    try:
        with opener.open(req, timeout=timeout) as response:
            if response.status != 200 or urlsplit(response.url).scheme != "https":
                raise SyncError("public_unavailable")
            body = response.read(MAX_RESPONSE + 1)
        if len(body) > MAX_RESPONSE:
            raise ValueError
        result = json.loads(body)
        stamp = result.get("generated_at") if isinstance(result, dict) else None
        if not valid_timestamp(stamp):
            raise ValueError
        return stamp
    except (OSError, error.URLError, ValueError, UnicodeError):
        raise SyncError("public_unavailable") from None


def wait_for_publication(generated_at, deadline):
    last_error = "public_unavailable"
    while True:
        timeout = min(30, time_left(deadline, last_error))
        try:
            if public_timestamp(timeout) == generated_at:
                return
            last_error = "public_snapshot_mismatch"
        except SyncError as exc:
            if exc.code == "interrupted":
                raise
            last_error = "public_unavailable"
        pause(deadline, last_error)


def private_open(path, flags):
    fd = os.open(path, flags | getattr(os, "O_NOFOLLOW", 0), 0o600)
    os.fchmod(fd, 0o600)
    return fd


def previous_status(cache):
    try:
        fd = private_open(cache / "scheduled-status.json", os.O_RDONLY)
        with os.fdopen(fd, "r") as stream:
            data = json.loads(stream.read(LOG_LIMIT))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError, AttributeError):
        return {}


def previous_success(cache):
    value = previous_status(cache).get("last_success_at")
    return value if valid_timestamp(value) else None


def timestamp_seconds(value):
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp() if valid_timestamp(value) else None


def latest_wake():
    """Read native wake/boot clocks, falling back to periodic checks if absent."""
    try:
        result = subprocess.run(["/usr/sbin/sysctl", "kern.waketime", "kern.boottime"],
                                capture_output=True, timeout=3)
        values = [int(value) for value in re.findall(rb"\bsec\s*=\s*(\d+)", result.stdout)]
        return max(values) if values else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def refresh_due(previous, now, wake=None):
    """Minute ticks do no network work until hourly, retry, or new-wake due."""
    started = timestamp_seconds(previous.get("started_at"))
    finished = timestamp_seconds(previous.get("finished_at"))
    success = timestamp_seconds(previous.get("last_success_at"))
    if wake is not None and 0 <= now - wake < WAKE_SETTLE_SECONDS:
        return False, "wake_settling"
    if started is None:
        return True, "initial"
    if started > now or success is not None and success > now or finished is not None and finished > now:
        return True, "clock_changed"
    if wake is not None and started < wake <= now:
        return True, "wake"
    # After a wake has triggered an attempt, its subsequent ticks obey backoff.
    if previous.get("status") != "success":
        return (now - max(started, finished or started) >= RETRY_SECONDS), "retry"
    return (success is None or now - success >= REFRESH_SECONDS), "hourly"


def write_status(cache, status):
    payload = (json.dumps(status, sort_keys=True) + "\n").encode("utf-8")
    fd, name = tempfile.mkstemp(prefix=".scheduled-", dir=cache)
    temporary = Path(name)
    try:
        with os.fdopen(fd, "wb") as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(payload)
        os.replace(temporary, cache / "scheduled-status.json")
    finally:
        temporary.unlink(missing_ok=True)
    if status["status"] == "running":
        return
    log = cache / "scheduled.log"
    if log.exists() and log.lstat().st_size + len(payload) > LOG_LIMIT:
        first, second = cache / "scheduled.log.1", cache / "scheduled.log.2"
        if first.exists():
            os.replace(first, second)
        os.replace(log, first)
    fd = private_open(log, os.O_CREAT | os.O_APPEND | os.O_WRONLY)
    with os.fdopen(fd, "ab") as stream:
        stream.write(payload)


def run(cache=None, budget=TOTAL_TIMEOUT, respect_schedule=False):
    cache = Path(cache) if cache is not None else CACHE
    status = {"status": "running", "started_at": utc_now(), "finished_at": None,
              "last_success_at": None, "commit": None, "generated_at": None}
    deadline = time.monotonic() + budget
    lock = None
    locked = False
    persist = False
    previous_handler = signal.signal(signal.SIGTERM, handle_termination)
    try:
        if cache.is_symlink():
            raise OSError
        cache.mkdir(parents=True, mode=0o700, exist_ok=True)
        os.chmod(cache, 0o700)
        lock = os.fdopen(private_open(cache / "scheduled.lock", os.O_CREAT | os.O_RDWR), "w")
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            # The active owner controls shared status/log files; do not clobber it.
            status.update(status="skipped", reason="scheduler_in_progress", finished_at=utc_now(),
                          last_success_at=previous_success(cache))
            return status
        locked = True
        status["last_success_at"] = previous_success(cache)
        if respect_schedule:
            due, reason = refresh_due(previous_status(cache), time.time(), latest_wake())
            if not due:
                # Preserve the last meaningful success/failure, including its
                # attempt timestamp. Idle minute ticks must not postpone retries.
                status.update(status="skipped", reason=reason, finished_at=utc_now())
                return status
            status["trigger"] = reason
        persist = True
        write_status(cache, status)
        script = Path(__file__).resolve().with_name("refresh_health.py")
        output = run_command([sys.executable, str(script), "--publish"],
                             time_left(deadline, "refresh_timeout"), "refresh_failed", "refresh_timeout")
        publication = publication_result(output)
        status.update(publication)
        if publication.get("status") != "skipped":
            # Both gates must succeed before recording a new last_success_at.
            wait_for_deployment(publication["commit"], deadline)
            wait_for_publication(publication["generated_at"], deadline)
            status.update(status="success", last_success_at=utc_now())
    except SyncError as exc:
        status.update(status="failed", error={"code": exc.code, "message": ERRORS[exc.code]})
    except OSError:
        status.update(status="failed", error={"code": "storage_failed", "message": ERRORS["storage_failed"]})
    except Exception:
        status.update(status="failed", error={"code": "unexpected_failure", "message": ERRORS["unexpected_failure"]})
    finally:
        # The subprocess is already reaped at this point. Finish the bounded
        # local write even if launchd repeats SIGTERM while unloading the job.
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        try:
            if locked and persist:
                status["finished_at"] = utc_now()
                try:
                    write_status(cache, status)
                except OSError:
                    status.update(status="failed", error={"code": "storage_failed", "message": ERRORS["storage_failed"]})
            if lock is not None:
                lock.close()
        finally:
            signal.signal(signal.SIGTERM, previous_handler)
    status["finished_at"] = status["finished_at"] or utc_now()
    return status


def main():
    # launchd has private fallback stdout/stderr files, but ordinary runs are
    # silent. Read scheduled-status.json for the bounded, sanitized result.
    return 1 if run(respect_schedule=True)["status"] == "failed" else 0


if __name__ == "__main__":
    sys.exit(main())
