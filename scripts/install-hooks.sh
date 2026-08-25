#!/bin/sh
# Point git's pre-commit at scripts/precheck.sh. Run once per clone.
#
# This writes .git/hooks/pre-commit only. The post-commit hook belongs to
# graphify (`graphify hook install`), and this script leaves it alone.

set -e
cd "$(git rev-parse --show-toplevel)"

cat > .git/hooks/pre-commit <<'HOOK'
#!/bin/sh
exec sh scripts/precheck.sh
HOOK
chmod +x .git/hooks/pre-commit

echo "✓ pre-commit hook installed"
echo "  It runs lint, test, build, then refreshes the graph and the wiki."
echo "  Skip it once with: git commit --no-verify"
