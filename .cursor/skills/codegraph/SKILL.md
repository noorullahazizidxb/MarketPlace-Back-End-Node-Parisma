---
name: codegraph
description: Queries the local Codegraph index before any Marketplace backend code question, edit, or feature survey. Use when exploring routes, services, workers, or call paths in MarketPlace-Back-End-Node-Parisma, or when the user mentions Codegraph, impact, or callers.
---

# Codegraph — Marketplace backend

The index lives in `.codegraph/`. Never open, read, grep, or edit that folder.

## First step

On any code question or edit, call `codegraph_explore` before other search tools.

- `projectPath`: `D:\MarketPlace\MarketPlace-Back-End-Node-Parisma`
- Put symbol names from `docs/feature-graph.md` in the query (router, controller, service, repository).

## After the graph answers

- Read a source file only when the graph names it, or when Codegraph returns nothing.
- Before changing a shared symbol, run `codegraph impact <symbol>` in this repo and list the callers you will touch.
- If `codegraph_explore` is missing, run `codegraph explore "<symbols>"` from this repo. `codegraph callers`, `codegraph callees`, and `codegraph impact` are the CLI forms of the unlisted tools.
- If Codegraph errors or returns nothing, say so, then use normal search.
- Diagrams are Mermaid built from graph results. Mark anything the graph did not confirm.
- Do not guess how modules connect.

This workspace also contains `D:\MarketPlace\MarketPlace-Next-JS`. Pass that path only when the question is about the frontend.
