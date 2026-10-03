#!/usr/bin/env bash
# ==========================================================================
#  Qevora AI SaaS — release packaging
#  Creates the two buyer-facing ZIP archives inside release/
#
#    bash tools/package.sh
#
#  full      : built HTML + assets + src/ + tools/ + README/CHANGELOG/LICENSE
#  html-only : built HTML + assets + README/CHANGELOG/LICENSE
#
#  Both archives exclude .git, node_modules, logs, editor files and the
#  release folder itself.
# ==========================================================================
set -euo pipefail

VERSION="1.0.0"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="release"
FULL="$OUT/qevora-ai-saas-ui-$VERSION-full.zip"
LITE="$OUT/qevora-ai-saas-ui-$VERSION-html-only.zip"

EXCLUDE=(".git/*" ".gitignore" "node_modules/*" "release/*" "*.log" "*.DS_Store" "*/.DS_Store" ".tmp/*")

mkdir -p "$OUT"
rm -f "$FULL" "$LITE"

echo "Building $FULL"
zip -rq "$FULL" . -x "${EXCLUDE[@]}"

echo "Building $LITE"
zip -rq "$LITE" index.html pages ai components auth utility documentation \
  assets README.txt CHANGELOG.txt LICENSE.txt -x "*.DS_Store" "*/.DS_Store"

echo
du -h "$FULL" "$LITE"
