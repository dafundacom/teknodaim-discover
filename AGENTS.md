# Agent Guidelines

<!--toc:start-->
- [Agent Guidelines](#agent-guidelines)
  - [Overview](#overview)
  - [Commands](#commands)
  - [Project Structure](#project-structure)
  - [Code Style](#code-style)
    - [Comments](#comments)
    - [TypeScript](#typescript)
    - [Formatting (Biome v2)](#formatting-biome-v2)
    - [Imports](#imports)
    - [Naming Conventions](#naming-conventions)
  - [Astro Conventions](#astro-conventions)
  - [Architecture Notes](#architecture-notes)
  - [Error Handling](#error-handling)
  - [Docs Search](#docs-search)
<!--toc:end-->

## Overview

Astro 5 SSR app (Node adapter) + Redis cache +
Postgres (Drizzle ORM). Package manager is **bun**.

## Commands

| Purpose | Command |
|---|---|
| Dev server (Astro + codegen watch) | `bun run dev` |
| Build | `bun run build` |
| Preview | `bun run preview` |
| Lint (check) | `bun run lint` |
| Lint (auto-fix) | `bun run lint:fix` |
| Format (check) | `bun run format:check` |
| Format (write) | `bun run format:write` |
| Fix all (format + lint) | `bun run fix` |
| Type check | `bun run typecheck` |
| Full check (format+lint+types) | `bun run check` |
| DB migrate | `bun run db:migrate` |
| DB generate | `bun run db:generate` |

**No test framework is configured.** Verification = passing `bun run check`
(format, lint, typecheck all green). Run this before every commit.

## Project Structure

```
src/
  assets/             # Static assets
  components/         # UI components (.astro + .svelte)
    ui/               # shadcn/ui components
  layouts/            # Astro layout components
  lib/                # Server-side utilities and business logic
    db/               # Drizzle ORM schemas and queries
  middleware.ts       # Astro middleware
  pages/              # Astro file-based routes
    api/              # API endpoints
  stores/             # nanostores state
  styles/             # Global CSS
  types/              # Shared TypeScript type definitions
```

## Code Style

### Comments
- never use comments or JSDoc to explain *what* the code is doing; the code should be self-explanatory

### TypeScript

- Strict mode + `strictNullChecks` — no `any`, no `@ts-ignore`
- `verbatimModuleSyntax` is enabled: **always** use `import type` for
  type-only imports
- Path alias `@/*` maps to `src/*` — use it everywhere, no relative `../`
  imports crossing directories
- Prefix unused parameters/variables with `_`
- Prefer `const` over `let`; never use `var`
- Use optional chaining (`?.`) over manual null guards

### Formatting (Biome v2)

- **Indent**: 2 spaces
- **Line width**: 80 characters
- **Line endings**: LF
- **Semicolons**: none (`asNeeded`)
- **Quotes**: double for JS/TS and JSX
- **Trailing commas**: all
- **Arrow parens**: always
- **Bracket spacing**: true
- **Bracket same line**: false

### Imports

- Biome's `organizeImports` is enabled — imports are sorted automatically
- Use `import type` for every type-only import (enforced by `useImportType`)
- No CommonJS (`require`/`module.exports`) — ES modules only
- Group order: external → `@/*` internal → relative (Biome handles this)

### Naming Conventions

- **Files**: kebab-case for all files (`content-resolver.ts`, `bot-filter.ts`)
- **Astro components**: PascalCase filename when used as a component import
- **Svelte components**: PascalCase function name, `.svelte` extension
- **Variables/functions**: camelCase
- **Types/interfaces**: PascalCase
- **Constants**: camelCase (not SCREAMING_SNAKE_CASE unless env vars)

## Astro Conventions

- Put all logic (data fetching, imports) in the `---` frontmatter block
- Server output mode — no static pre-rendering unless explicitly marked
- `experimental.clientPrerender = true` is enabled

## Architecture Notes

- **Caching**: Redis (`src/lib/redis.ts`) for GraphQL responses and view
  buffering

## Error Handling

- Never swallow errors silently; surface them as typed responses or throw
- Prefer type-safe patterns; avoid casting with `as` unless absolutely
  necessary and comment why

## Docs Search

When you need framework or library documentation, use the `context7` tools
to look up accurate, version-matched docs.
