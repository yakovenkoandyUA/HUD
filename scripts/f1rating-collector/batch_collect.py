#!/usr/bin/env python3
"""
MIMIR F1 Driver Rating Model — batch FastF1 collector.

Collects Qualifying + Race sessions for a LIST of rounds, for the FULL GRID as it actually lined
up in each session (no hardcoded driver roster — see `collect.collect_qualifying`/`collect_race`
docstrings). Reuses `collect.collect_round` — the exact same function the single-round CLI uses —
so batch output can never silently diverge from `collect.py --round N` output.

Usage:
    .venv/bin/python3 batch_collect.py --season 2025 --rounds 1,4,7,10,13,16,19,22,24
    .venv/bin/python3 batch_collect.py --season 2025 --rounds 1-24   # range syntax
    .venv/bin/python3 batch_collect.py --season 2025 --rounds 1,4,7 --force  # re-collect even if present

Deliberately Q + R sessions ONLY — sprint weekends also have Sprint/SprintQualifying sessions,
which this script never touches, so sprint results can never silently mix into race results
(the `RawRaceMetrics` grouping is by round number; a Sprint session's laps have no business
being in that same bucket as the Race session's laps).

Writes one `output/{season}_{round:02d}.json` per round (same file `collect.py` would write —
this IS the same schema, just full-grid instead of a hand-picked driver list) and a single
machine-readable `output/collection-summary-{season}.json` at the end. Exits 0 if every
requested round succeeded or was validly skipped-existing; exits 1 if any round failed
unrecoverably (see `--fail-fast` for stop-on-first-failure instead of continuing the batch).

RESUMABILITY: already-collected rounds are skipped by default (valid = parses as JSON, has the
expected schemaVersion, and has both `qualifying` and `race` non-empty). Re-running this script
after a partial/interrupted run picks up exactly where it left off. Pass `--force` to
re-collect everything regardless of what's already on disk.

No infinite retry: each round is attempted exactly once per run. If FastF1 fails for a round
(session doesn't exist yet, no data available, network error), it is recorded as `failed` in the
summary and the script moves on to the next round (or stops immediately with `--fail-fast`).
"""
import argparse
import json
import sys
import time
from pathlib import Path

import fastf1

import collect

# Sessions this collector will ever touch. Sprint/SprintQualifying deliberately excluded — see
# module docstring.
COLLECTED_SESSIONS = ["Q", "R"]


def parse_round_spec(spec: str) -> list[int]:
    """Accepts "1,4,7" or "1-24" or a mix "1-3,7,10-12", returns a sorted unique list."""
    rounds: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start, end = int(start_str), int(end_str)
            rounds.update(range(start, end + 1))
        else:
            rounds.add(int(part))
    return sorted(rounds)


def existing_export_is_valid(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return False
    if data.get("schemaVersion") != collect.SCHEMA_VERSION:
        return False
    if not data.get("qualifying") or not data.get("race"):
        return False
    return True


def collect_one_round(season: int, round_no: int, out_dir: Path, force: bool) -> dict:
    """Returns a status record: {round, status, sessions, driverCount, error}."""
    out_path = out_dir / f"{season}_{round_no:02d}.json"

    if not force and existing_export_is_valid(out_path):
        existing = json.loads(out_path.read_text())
        return {
            "round": round_no, "status": "skipped-existing", "sessions": COLLECTED_SESSIONS,
            "driverCount": len({r["driverId"] for r in existing["race"]}), "error": None,
        }

    try:
        payload = collect.collect_round(season, round_no)
    except Exception as exc:  # noqa: BLE001 — deliberately broad: any FastF1/network failure is "failed", not a crash
        message = str(exc)
        if "does not exist" in message.lower() or "not yet available" in message.lower():
            status = "unavailable-session"
        else:
            status = "failed"
        return {"round": round_no, "status": status, "sessions": [], "driverCount": 0, "error": message}

    driver_count = len({r["driverId"] for r in payload["race"]})
    if driver_count == 0:
        return {
            "round": round_no, "status": "unavailable-session", "sessions": [],
            "driverCount": 0, "error": "session loaded but produced zero race entries",
        }

    q_count = len(payload["qualifying"])
    r_count = len(payload["race"])
    status = "partial-data" if (q_count == 0 or r_count < driver_count) else "success"

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2))

    return {"round": round_no, "status": status, "sessions": COLLECTED_SESSIONS, "driverCount": driver_count, "error": None}


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="MIMIR F1 rating — batch FastF1 collector (full grid, multi-round)")
    parser.add_argument("--season", type=int, required=True)
    parser.add_argument("--rounds", type=str, required=True, help='e.g. "1,4,7" or "1-24" or "1-3,7,10-12"')
    parser.add_argument("--cache", type=str, default="cache")
    parser.add_argument("--out", type=str, default="output")
    parser.add_argument("--force", action="store_true", help="Re-collect rounds even if a valid export already exists")
    parser.add_argument("--fail-fast", action="store_true", help="Stop immediately on the first failed round")
    return parser


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    rounds = parse_round_spec(args.rounds)
    out_dir = Path(args.out)
    cache_dir = Path(args.cache)
    cache_dir.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(cache_dir))

    print(f"Batch collecting season={args.season} rounds={rounds} force={args.force}", file=sys.stderr)

    results: list[dict] = []
    started_at = time.time()
    for round_no in rounds:
        print(f"[{round_no}] collecting...", file=sys.stderr)
        record = collect_one_round(args.season, round_no, out_dir, args.force)
        results.append(record)
        print(f"[{round_no}] {record['status']} (drivers={record['driverCount']})", file=sys.stderr)
        if record["status"] == "failed" and args.fail_fast:
            print(f"[{round_no}] --fail-fast: stopping batch", file=sys.stderr)
            break

    summary = {
        "season": args.season,
        "requestedRounds": rounds,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "durationSeconds": round(time.time() - started_at, 1),
        "results": results,
        "counts": {
            status: sum(1 for r in results if r["status"] == status)
            for status in ["success", "skipped-existing", "unavailable-session", "partial-data", "failed"]
        },
    }

    summary_path = out_dir / f"collection-summary-{args.season}.json"
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, indent=2))
    print(f"Wrote {summary_path}", file=sys.stderr)
    print(json.dumps(summary["counts"]), file=sys.stderr)

    unrecoverable = summary["counts"]["failed"]
    return 1 if unrecoverable > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
