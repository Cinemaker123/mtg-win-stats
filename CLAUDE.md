# mtg-win-stats

**Read `AGENTS.md` first.** It holds this project's invariants: the rules that
must stay true, and that the code alone does not tell you (frozen legacy
baseline, dirty-flag saves, one winner per game, colours in CSS only, one
provider mount).

Read the other files only when the task needs them:

| File | Contents |
|---|---|
| `README.md` | What the app does, how to run it, deployment, CI |
| `HISTORY.md` | Past refactors |
| `progress.md` | Planned and unfinished work |
| `SUPABASE_SETUP.md` | Database schema and SQL functions |
| `auth.md` | Security levels and the applied RLS hardening |

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- For broad orientation, read graphify-out/wiki/index.md. The pre-commit hook keeps it current (`scripts/precheck.sh`).
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
