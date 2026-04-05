# DuckDB-WASM × Next.js Demo

[![License: MIT](https://img.shields.io/github/license/ttekun/duckdb-wasm-nextjs-demo)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![DuckDB-WASM](https://img.shields.io/badge/DuckDB--WASM-1.28-FFF000?logo=duckdb&logoColor=black)](https://duckdb.org/docs/api/wasm/overview)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)

> Run SQL in the browser — fully client-side data storage with no backend required.

This project demonstrates how to integrate **DuckDB-WASM** into a Next.js application. All data is stored and queried via SQL directly in the browser using WebAssembly. No server, no database connection, no cloud — just the browser.

## Why This Is Interesting

Most web apps need a backend to persist data. DuckDB-WASM flips that assumption:

- **Full SQL in the browser** — `SELECT`, `INSERT`, `UPDATE`, `DELETE` all run locally via WebAssembly
- **Zero backend** — no API server, no database server, nothing to deploy
- **Real DuckDB** — the same high-performance analytical engine, running client-side

This demo uses a simple TODO app as the vehicle to show the pattern end-to-end.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 + React 18 |
| Database | DuckDB-WASM |
| Language | TypeScript (strict mode) |
| Testing | Jest + Testing Library |

## Getting Started

```bash
git clone https://github.com/ttekun/duckdb-wasm-nextjs-demo.git
cd duckdb-wasm-nextjs-demo
npm install
npm run dev   # automatically downloads WASM files on first run
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The first load takes a few seconds while WebAssembly modules are fetched. Subsequent operations are fast.

## How It Works

```
Browser
  └── Next.js (SSR disabled for DuckDB compatibility)
        └── DuckDB-WASM (WebAssembly)
              └── In-memory SQL database
                    └── todos table (BIGINT id, TEXT, BOOLEAN)
```

DuckDB is initialized as a singleton on the client side. All SQL operations use **prepared statements** to prevent injection. The singleton pattern ensures a single database connection is shared across the app.

## Key Implementation Points

- **`src/services/duckDbStorage.ts`** — DuckDB singleton with `initialize()`, CRUD via prepared statements
- **`src/pages/index.tsx`** — SSR disabled via `next/dynamic` (`{ ssr: false }`)
- **`setup-duckdb.js`** — downloads WASM binaries from jsDelivr CDN to `public/duckdb-wasm/`

## Running Tests

```bash
npm test              # run all tests
npm run test:watch    # watch mode
```

Tests cover both the UI component (mocked storage) and the storage service (SQL verification via low-level mock).

## Project Structure

```
src/
├── pages/index.tsx          # Entry point (SSR disabled)
├── components/
│   └── TodoAppComponent.tsx # Main UI
├── services/
│   └── duckDbStorage.ts     # DuckDB-WASM singleton
└── types/
    └── todo.ts              # Interfaces
__tests__/
├── TodoAppComponent.test.tsx
└── duckDbStorage.test.ts    # Verifies actual SQL and parameter binding
```

## Further Reading

- [Architecture Overview](docs/duck-wasm-schema.md)
- [Troubleshooting Guide](docs/troubleshooting-guide.md)
