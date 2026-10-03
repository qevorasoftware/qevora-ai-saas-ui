#!/usr/bin/env bash
# ==========================================================================
#  Qevora AI SaaS UI — release packaging
#
#    bash tools/package.sh              build both ZIPs, then verify them
#    bash tools/package.sh --no-verify  build only
#
#  release/qevora-ai-saas-ui-<version>.zip            ← ThemeForest buyer ZIP
#      index.html, 404.html, pages/, ai/, components/, auth/, utility/,
#      documentation/, assets/, README.txt, CHANGELOG.txt, LICENSE.txt
#      (everything a customer needs; no source fragments, no build tooling)
#
#  release/qevora-ai-saas-ui-<version>-developer.zip  ← internal/source ZIP
#      the buyer package plus src/, tools/, PROJECT-STATUS.md, README.md and
#      the marketplace submission kit
#
#  The version is read from tools/build.mjs (const VERSION), so the ZIP names,
#  the README/CHANGELOG headings and the ?v= cache-busting query can never
#  drift apart. tools/release.mjs then re-opens the buyer ZIP and checks it.
# ==========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(sed -n 's/^const VERSION = "\(.*\)";/\1/p' tools/build.mjs)"
if [ -z "$VERSION" ]; then
  echo "package.sh: could not read VERSION from tools/build.mjs" >&2
  exit 1
fi

OUT="release"
BUYER="$OUT/qevora-ai-saas-ui-$VERSION.zip"
DEVELOPER="$OUT/qevora-ai-saas-ui-$VERSION-developer.zip"
FOLDER="qevora-ai-saas-ui"

BUYER_FILES=(index.html 404.html pages ai components auth utility documentation assets README.txt CHANGELOG.txt LICENSE.txt)
DEV_EXCLUDE=(".git/*" "node_modules/*" ".tmp/*" "release/*" "*.log" "*.DS_Store" "*/.DS_Store")

# ------------------------------------------------------------------ checks --
missing=()
for entry in "${BUYER_FILES[@]}"; do
  [ -e "$entry" ] || missing+=("$entry")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "package.sh: nothing to package — run 'node tools/build.mjs' first (missing: ${missing[*]})" >&2
  exit 1
fi

mkdir -p "$OUT"
rm -f "$BUYER" "$DEVELOPER"

# ------------------------------------------------------------- buyer ZIP ----
# Staged into a single top-level folder, exactly like the recommended
# marketplace structure, so extracting never litters the customer's desktop.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/$FOLDER"

echo "Building $BUYER"
for entry in "${BUYER_FILES[@]}"; do
  cp -R "$entry" "$STAGE/$FOLDER/"
done
find "$STAGE" -name ".DS_Store" -delete
(
  cd "$STAGE"
  zip -rq "$ROOT/$BUYER" "$FOLDER" -x "*.DS_Store" "*/.DS_Store"
)

# --------------------------------------------------------- developer ZIP ----
echo "Building $DEVELOPER"
zip -rq "$DEVELOPER" . -x "${DEV_EXCLUDE[@]}"

# ------------------------------------------------------------- verify -------
if [ "${1:-}" != "--no-verify" ]; then
  echo
  node tools/release.mjs --strict
else
  echo
  du -h "$BUYER" "$DEVELOPER"
fi
