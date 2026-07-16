#!/usr/bin/env python3
"""
Migrate color-mix() calls to semantic CSS tokens.

Strategy:
- Replace patterns that already have tokens (panel-*, tint-*)
- Replace new patterns that appear ≥3 times across the codebase
- Skip dynamic CSS variable patterns (--space-color, --cat-color, etc.)
- Skip patterns with raw hex values (those are context-specific)
"""

import re
import os
import sys
from pathlib import Path

SRC = Path("/Users/andriiyakovenko/Desktop/OWN/HUD/client/src")

# Patterns with extra whitespace are normalized via regex
# Order matters: longer/more-specific patterns first

# Each entry: (regex_pattern, replacement, token_name)
REPLACEMENTS = [
    # ── Existing tokens (panel-*) ───────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--negative\)\s+8%,\s*var\(--surface\)\)",
     "var(--panel-danger-bg)", "panel-danger-bg"),

    (r"color-mix\(in\s+srgb,\s*var\(--negative\)\s+22%,\s*transparent\)",
     "var(--panel-danger-border)", "panel-danger-border"),

    (r"color-mix\(in\s+srgb,\s*var\(--positive\)\s+8%,\s*var\(--surface\)\)",
     "var(--panel-success-bg)", "panel-success-bg"),

    (r"color-mix\(in\s+srgb,\s*var\(--positive\)\s+22%,\s*transparent\)",
     "var(--panel-success-border)", "panel-success-border"),

    (r"color-mix\(in\s+srgb,\s*var\(--orange\)\s+8%,\s*var\(--surface\)\)",
     "var(--panel-warning-bg)", "panel-warning-bg"),

    (r"color-mix\(in\s+srgb,\s*var\(--orange\)\s+22%,\s*transparent\)",
     "var(--panel-warning-border)", "panel-warning-border"),

    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+22%,\s*transparent\)",
     "var(--panel-accent-border)", "panel-accent-border"),

    # ── Existing tokens (tint-*) ────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+12%,\s*transparent\)",
     "var(--tint-accent)", "tint-accent"),

    (r"color-mix\(in\s+srgb,\s*var\(--negative\)\s+12%,\s*transparent\)",
     "var(--tint-danger)", "tint-danger"),

    (r"color-mix\(in\s+srgb,\s*var\(--positive\)\s+14%,\s*transparent\)",
     "var(--tint-success)", "tint-success"),

    (r"color-mix\(in\s+srgb,\s*var\(--orange\)\s+12%,\s*transparent\)",
     "var(--tint-warning)", "tint-warning"),

    (r"color-mix\(in\s+srgb,\s*var\(--gold\)\s+12%,\s*transparent\)",
     "var(--tint-gold)", "tint-gold"),

    # ── New accent tint scale ───────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+5%,\s*transparent\)",
     "var(--tint-accent-xs)", "tint-accent-xs"),

    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+8%,\s*transparent\)",
     "var(--tint-accent-sm)", "tint-accent-sm"),

    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+10%,\s*transparent\)",
     "var(--tint-accent-10)", "tint-accent-10"),

    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+15%,\s*transparent\)",
     "var(--tint-accent-md)", "tint-accent-md"),

    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+30%,\s*transparent\)",
     "var(--tint-accent-lg)", "tint-accent-lg"),

    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+40%,\s*transparent\)",
     "var(--tint-accent-xl)", "tint-accent-xl"),

    # ── Accent-on-surface ───────────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+6%,\s*var\(--surface\)\)",
     "var(--accent-wash)", "accent-wash"),

    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+10%,\s*var\(--surface\)\)",
     "var(--accent-wash-md)", "accent-wash-md"),

    # ── Gold tints ──────────────────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--gold\)\s+12%,\s*var\(--surface\)\)",
     "var(--tint-gold-sm)", "tint-gold-sm"),

    (r"color-mix\(in\s+srgb,\s*var\(--gold\)\s+30%,\s*transparent\)",
     "var(--tint-gold-md)", "tint-gold-md"),

    # ── Border alpha ────────────────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--border\)\s+50%,\s*transparent\)",
     "var(--border-alpha-50)", "border-alpha-50"),

    (r"color-mix\(in\s+srgb,\s*var\(--border\)\s+60%,\s*transparent\)",
     "var(--border-alpha-60)", "border-alpha-60"),

    # ── Muted text tint ─────────────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--text3\)\s+12%,\s*transparent\)",
     "var(--tint-muted)", "tint-muted"),

    # ── Second color tint ───────────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--second\)\s+14%,\s*var\(--surface2\)\)",
     "var(--tint-second)", "tint-second"),

    # ── Accent-on-border (strong) ────────────────────────────────────────────
    (r"color-mix\(in\s+srgb,\s*var\(--accent\)\s+30%,\s*var\(--border\)\)",
     "var(--accent-border-strong)", "accent-border-strong"),
]

# Patterns to SKIP (dynamic CSS variables — can't be tokenized)
SKIP_PATTERNS = [
    "--space-color",
    "--cat-color",
    "--team-color",
    "--badge-color",
    "--type-color",
    "--task-quest",
    "--task-shopping",
]

compiled = [(re.compile(pat), repl, name) for pat, repl, name in REPLACEMENTS]


def should_skip_line(line: str) -> bool:
    return any(skip in line for skip in SKIP_PATTERNS)


def process_file(path: Path, dry_run: bool = False) -> dict[str, int]:
    content = path.read_text(encoding="utf-8")
    original = content
    counts: dict[str, int] = {}

    lines = content.split("\n")
    new_lines = []

    for line in lines:
        if should_skip_line(line):
            new_lines.append(line)
            continue

        new_line = line
        for pattern, replacement, name in compiled:
            new_line, n = pattern.subn(replacement, new_line)
            if n:
                counts[name] = counts.get(name, 0) + n

        new_lines.append(new_line)

    new_content = "\n".join(new_lines)

    if new_content != original and not dry_run:
        path.write_text(new_content, encoding="utf-8")

    return counts


def main():
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv or dry_run

    css_files = sorted(SRC.rglob("*.css"))
    # Skip global.css — it defines the tokens; replacing there would create circular refs
    css_files = [f for f in css_files if f.name != "global.css"]
    total_counts: dict[str, int] = {}
    changed_files = 0

    for f in css_files:
        counts = process_file(f, dry_run=dry_run)
        if counts:
            changed_files += 1
            rel = f.relative_to(SRC)
            if verbose:
                print(f"\n{rel}")
                for name, n in sorted(counts.items()):
                    print(f"  {n}x  {name}")
            for name, n in counts.items():
                total_counts[name] = total_counts.get(name, 0) + n

    print(f"\n{'DRY RUN — ' if dry_run else ''}Changed {changed_files} files\n")
    print("Token replacement summary:")
    for name, n in sorted(total_counts.items(), key=lambda x: -x[1]):
        print(f"  {n:3d}x  --{name}")


if __name__ == "__main__":
    main()
