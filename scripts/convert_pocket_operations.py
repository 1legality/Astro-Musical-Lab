#!/usr/bin/env python3
"""Simple YAML -> JSON converter for pocket_operations_full.yaml

Usage: python scripts/convert_pocket_operations.py [--minify-only] [--minify]

By default the script overwrites/creates the pretty-printed JSON file
`src/content/DrumPatternsTools/pocket_operations_full.json` with
indent=2 formatting. Use `--minify` to also write
`pocket_operations_full.min.json` (compact file). Use `--minify-only` to
write only the minified file and leave the pretty file untouched.
"""
import json
from pathlib import Path

try:
    import yaml
except Exception:
    raise SystemExit("PyYAML is required. Run: pip install pyyaml")

ROOT = Path(__file__).resolve().parents[1]
YAML_PATH = ROOT / 'src' / 'content' / 'DrumPatternsTools' / 'pocket_operations_full.yaml'
JSON_PATH = ROOT / 'src' / 'content' / 'DrumPatternsTools' / 'pocket_operations_full.json'

def main(minify: bool = True, minify_only: bool = False):
    if not YAML_PATH.exists():
        raise SystemExit(f"YAML file not found: {YAML_PATH}")

    with YAML_PATH.open('r', encoding='utf-8') as fh:
        data = yaml.safe_load(fh)

    # Write pretty (indent=2) unless --minify-only
    if not minify_only:
        JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'Wrote pretty JSON to: {JSON_PATH}')

    # Write a compact/minified JSON if requested
    if minify:
        min_path = JSON_PATH.with_name(JSON_PATH.stem + '.min.json')
        min_path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'Wrote minified JSON to: {min_path}')

if __name__ == '__main__':
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument('--no-minify', dest='minify', action='store_false', help='Do not write a minified JSON file')
    p.add_argument('--minify-only', dest='minify_only', action='store_true', help='Write only the minified JSON and skip pretty output')
    args = p.parse_args()

    # convert
    main(minify=args.minify, minify_only=args.minify_only)
