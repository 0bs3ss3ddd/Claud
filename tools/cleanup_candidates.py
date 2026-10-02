#!/usr/bin/env python3
"""Find files that are probably safe to delete. NEVER deletes anything.

Default: dry run, prints a report and writes report.md.
--apply: MOVES candidates into <dest>/_TO_DELETE/<category>/ so you can review and delete by hand.

Usage:
  python cleanup_candidates.py ~/Downloads ~/Documents ~/Desktop
  python cleanup_candidates.py ~/Downloads --apply
"""
import argparse, hashlib, os, shutil, sys, time
from collections import defaultdict
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "Library", "AppData",
             "Windows", "Program Files", "Program Files (x86)", "System", "Applications",
             "_TO_DELETE", "$RECYCLE.BIN"}
TEMP_EXT = {".tmp", ".temp", ".bak", ".old", ".crdownload", ".part", ".swp", ".dmp"}
TEMP_NAMES = {"thumbs.db", ".ds_store", "desktop.ini"}
INSTALLER_EXT = {".exe", ".msi", ".dmg", ".pkg", ".iso", ".deb", ".rpm", ".apk"}
DAY = 86400

def human(n):
    for u in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024: return f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} PB"

def walk(roots):
    for root in roots:
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in SKIP_DIRS]
            for fn in fns:
                p = Path(dp) / fn
                try:
                    if p.is_symlink(): continue
                    yield p, p.stat()
                except OSError:
                    pass

def sha(p, size):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while chunk := f.read(1 << 20): h.update(chunk)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roots", nargs="+")
    ap.add_argument("--apply", action="store_true", help="move candidates into _TO_DELETE")
    ap.add_argument("--dest", default=str(Path.home()), help="where _TO_DELETE is created")
    ap.add_argument("--installer-days", type=int, default=90)
    ap.add_argument("--big-mb", type=int, default=500)
    ap.add_argument("--big-days", type=int, default=365)
    a = ap.parse_args()

    now = time.time()
    found = defaultdict(list)  # category -> [(path, size, reason)]
    by_size = defaultdict(list)
    for p, st in walk([Path(r).expanduser() for r in a.roots]):
        age = (now - st.st_mtime) / DAY
        if st.st_size == 0:
            found["empty_files"].append((p, 0, "empty file")); continue
        if p.suffix.lower() in TEMP_EXT or p.name.lower() in TEMP_NAMES:
            found["temp_junk"].append((p, st.st_size, "temp/backup/system junk")); continue
        if p.suffix.lower() in INSTALLER_EXT and age > a.installer_days:
            found["old_installers"].append((p, st.st_size, f"installer, {age:.0f} days old")); continue
        if st.st_size > a.big_mb * 1048576 and age > a.big_days:
            found["big_old_files"].append((p, st.st_size, f"{human(st.st_size)}, untouched {age:.0f} days")); continue
        by_size[st.st_size].append((p, st))

    for size, items in by_size.items():  # duplicates: same size, then same hash
        if len(items) < 2 or size < 1024: continue
        groups = defaultdict(list)
        for p, st in items:
            try: groups[sha(p, size)].append((p, st))
            except OSError: pass
        for g in groups.values():
            if len(g) < 2: continue
            g.sort(key=lambda x: (x[1].st_mtime, len(str(x[0]))))  # keep oldest
            for p, st in g[1:]:
                found["duplicates"].append((p, st.st_size, f"duplicate of {g[0][0]}"))

    total = sum(s for v in found.values() for _, s, _ in v)
    lines = ["# Cleanup candidates", "", f"Total: {sum(len(v) for v in found.values())} files, {human(total)}", ""]
    for cat, items in sorted(found.items()):
        lines += [f"## {cat} ({len(items)}, {human(sum(s for _, s, _ in items))})", ""]
        lines += [f"- `{p}` ({human(s)}) - {why}" for p, s, why in sorted(items, key=lambda x: -x[1])]
        lines.append("")
    report = "\n".join(lines)
    Path("report.md").write_text(report, encoding="utf-8")
    print(report)

    if not a.apply:
        print("\nDRY RUN: nothing moved. Review report.md, then re-run with --apply.")
        return
    base = Path(a.dest).expanduser() / "_TO_DELETE"
    manifest = []
    for cat, items in found.items():
        for p, s, why in items:
            target = base / cat / f"{abs(hash(str(p))) % 10**6}_{p.name}"
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                shutil.move(str(p), str(target))
                manifest.append(f"{target}\t<-\t{p}")
            except OSError as e:
                print(f"skip {p}: {e}", file=sys.stderr)
    (base / "MANIFEST.txt").write_text("\n".join(manifest), encoding="utf-8")
    print(f"\nMoved {len(manifest)} files to {base}. MANIFEST.txt lists original locations (to restore).")
    print("Review the folder, then delete it yourself.")

if __name__ == "__main__":
    main()
