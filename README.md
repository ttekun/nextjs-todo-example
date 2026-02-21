# Next.js TODO App (DuckDB-WASM Version)

This project is a simple TODO application built with Next.js. It uses DuckDB-WASM for data storage.

## Features

- Simple TODO application built with Next.js
- DuckDB-WASM (DuckDB running on WebAssembly) for data storage
- Runs as an in-browser SQL database
- Modern UI/UX
- Responsive design (mobile-friendly)
- Type safety with TypeScript
- Unit testing with Jest

## Tech Stack

- Next.js
- React
- DuckDB-WASM
- TypeScript
- SQL
- Jest & Testing Library

## Installation

```bash
# Clone the repository
git clone https://github.com/ttekun/nextjs-todo-example.git

# Navigate to the directory
cd nextjs-todo-example

# Install dependencies
npm install

# Setup DuckDB-WASM files
npm run setup

# Start the development server (setup script runs automatically)
npm run dev
```

With this setup:

1. The `public/duckdb-wasm` directory is not pushed to GitHub
2. Required WASM files are downloaded via `npm run setup`
3. The setup script runs automatically when executing `npm run dev`

This approach keeps the repository size small while making it easy for developers to get started.

Open [http://localhost:3000](http://localhost:3000) in your browser to use the application.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch
```

## Data Structure

TODO data is stored with the following SQL table structure:

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE
);
```

## Features

- Add TODO items
- Delete TODO items
- Edit TODO items
- Toggle TODO completion status

## Project Structure

```
/
├── src/                # Source code root directory
│   ├── pages/          # Next.js routing pages
│   ├── components/     # Reusable UI components
│   ├── services/       # Services like data storage
│   └── types/          # TypeScript type definitions
├── public/             # Static files
├── docs/               # Project documentation
└── __tests__/          # Test files
```

## Documentation

For detailed documentation about the project, refer to the following files:

- [Architecture Overview](docs/duck-wasm-schema.md) - Application structure and data flow
- [TypeScript and Next.js Learning Guide](docs/typescript-nextjs-learning-guide.md) - Basic concepts of TypeScript and Next.js
- [Architecture Schema](docs/typescript-nextjs-schema.md) - Mermaid diagrams to visually understand the project architecture
- [Troubleshooting Guide](docs/troubleshooting-guide.md) - Potential issues and solutions

## Type Definitions

TypeScript type definitions are implemented as follows:

```typescript
// Todo type
export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// Storage service interface
export interface StorageService {
  initialize: () => Promise<void>;
  getAllTodos: () => Promise<Todo[]>;
  addTodo: (todo: Todo) => Promise<boolean>;
  deleteTodo: (id: number) => Promise<boolean>;
  updateTodo: (todo: Todo) => Promise<boolean>;
  close: () => Promise<void>;
}
```

## Performance

DuckDB-WASM may take some time to load initially because it loads WebAssembly modules. However, once loaded, subsequent operations run smoothly.