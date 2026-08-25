#!/bin/sh
# Everything that must be true before a commit lands, plus the doc artifacts
# that go stale silently.
#
# Run it by hand with `npm run check`. The pre-commit hook runs it for you.
# Install the hook once per clone with `npm run hooks:install`.
#
# Gates 1-3 block the commit. The graphify steps never block: a missing or
# broken graphify must not stop you from committing code.

set -e
cd "$(git rev-parse --show-toplevel)"

echo "→ lint"
npm run lint

echo "→ test"
npm test

# The build is the only gate that catches a deleted export still imported
# somewhere. Lint and the tests both miss it.
echo "→ build"
npm run build >/dev/null

set +e

if command -v graphify >/dev/null 2>&1; then
  # `graphify update .` refreshes graph.json. It does NOT refresh the wiki,
  # so the export has to run after it, every time.
  echo "→ graph"
  graphify update . >/dev/null 2>&1 || echo "  warning: graphify update failed, graph is stale"
  echo "→ wiki"
  graphify export wiki >/dev/null 2>&1 || echo "  warning: wiki export failed, wiki is stale"
else
  echo "→ graphify not installed, skipping graph and wiki"
fi

echo "✓ all checks passed"
