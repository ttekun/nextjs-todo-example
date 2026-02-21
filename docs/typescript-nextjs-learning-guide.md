# TypeScript and Next.js Learning Guide

This document is a learning guide for software engineers who have SQL experience but no TypeScript or Next.js experience. It explains the basics of TypeScript and Next.js using this TODO app project as an example.

## Table of Contents

1. [TypeScript Basics](#typescript-basics)
2. [Introduction to React](#introduction-to-react)
3. [Next.js Framework](#nextjs-framework)
4. [Project Structure](#project-structure)
5. [Handling Data](#handling-data)
6. [Asynchronous Processing](#asynchronous-processing)
7. [Development Environment Setup](#development-environment-setup)
8. [Learning Resources](#learning-resources)

## TypeScript Basics

TypeScript is a superset of JavaScript that provides static typing. If you're familiar with SQL, the concept of types should be intuitive.

### Basic Type Definitions

```typescript
// Primitive types
let id: number = 1;
let name: string = "Task";
let completed: boolean = false;

// Arrays
let tasks: string[] = ["Task 1", "Task 2"];

// Objects
let task: { id: number; name: string } = { id: 1, name: "Task" };

// Type alias
type Task = {
  id: number;
  name: string;
  completed: boolean;
};

// Interface (method used in this project)
interface Todo {
  id: number;
  text: string;
  done: boolean;
}
```

### Example of Type Definitions in the Project

In this project, type definitions are defined in the `types/todo.ts` file:

```typescript
export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export interface StorageService {
  initialize: () => Promise<void>;
  getAllTodos: () => Promise<Todo[]>;
  addTodo: (todo: Todo) => Promise<boolean>;
  deleteTodo: (id: number) => Promise<boolean>;
  updateTodo: (todo: Todo) => Promise<boolean>;
  close: () => Promise<void>;
}
```

### Similarities with SQL

SQL table definitions and TypeScript type definitions are similar:

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE
);
```

```typescript
interface Todo {
  id: number;
  text: string;
  done: boolean;
}
```

This correspondence is intuitive to understand.

## Introduction to React

React is a JavaScript library for building UIs. It takes a component-based approach.

### Component Basics

```typescript
import React from 'react';

// Function component
const TaskItem: React.FC<{ task: Todo }> = ({ task }) => {
  return (
    <div>
      <h3>{task.text}</h3>
      <p>Completed: {task.done ? 'Yes' : 'No'}</p>
    </div>
  );
};

export default TaskItem;
```

### Using Hooks

In React, "hooks" are used to add state and lifecycle features to components:

```typescript
import React, { useState, useEffect } from 'react';

const TodoList: React.FC = () => {
  // State management
  const [todos, setTodos] = useState<Todo[]>([]);

  // Lifecycle (runs when component mounts)
  useEffect(() => {
    // Data loading process
    async function loadTodos() {
      const data = await fetchTodos();
      setTodos(data);
    }

    loadTodos();
  }, []); // Empty array means it only runs on mount

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
};
```

## Next.js Framework

Next.js is a React-based framework that provides routing, server-side rendering, static site generation, and more.

### Basic Page Structure

In Next.js, files in the `pages` directory are automatically routed:

```typescript
// pages/index.tsx
import React from "react";
import dynamic from 'next/dynamic';

// Component with server-side rendering disabled
const TodoAppWithNoSSR = dynamic(
  () => import('./TodoAppComponent'),
  { ssr: false }
);

const IndexPage: React.FC = () => {
  return <TodoAppWithNoSSR />;
};

export default IndexPage;
```

### Client-Side Only Processing

When using WebAssembly (DuckDB-WASM in this project), it doesn't work on the server-side, so you need to configure it to run only on the client-side:

```typescript
// Conditional branch to avoid server-side execution
if (typeof window !== 'undefined') {
  // Code that only runs on the client-side
}

// Disable SSR with dynamic import
const ComponentWithNoSSR = dynamic(
  () => import('./Component'),
  { ssr: false }
);
```

## Project Structure

The basic structure of a Next.js project is as follows:

```
/
├── pages/              # Routed pages
│   ├── _app.tsx        # App global settings
│   ├── index.tsx       # Root page (/)
│   └── ...
├── public/             # Static files
├── styles/             # CSS files
├── components/         # Reusable components
├── types/              # Type definitions
├── package.json        # Dependencies and settings
└── tsconfig.json       # TypeScript settings
```

For this TODO app:

```
/
├── pages/
│   ├── index.tsx         # Main page
│   ├── TodoAppComponent.tsx  # TODO app main logic
│   ├── duckDbStorage.ts  # Data storage implementation
│   └── _app.tsx          # App-wide settings
├── types/
│   └── todo.ts           # TODO type definitions
├── public/
│   └── duckdb-wasm/      # WebAssembly files
└── ...
```

## Handling Data

This project uses DuckDB-WASM (DuckDB running on WebAssembly) for data storage.

### Data Storage Implementation

```typescript
class DuckDbStorageService implements StorageService {
  // Properties
  private db: any;
  private conn: any;
  private initialized: boolean;

  // Initialization method
  async initialize(): Promise<void> {
    // Initialize WebAssembly database
    // Create tables
  }

  // Data operation methods
  async getAllTodos(): Promise<Todo[]> {
    // Execute SQL query
    const result = await this.conn.query(`SELECT * FROM todos ORDER BY id`);
    return result.toArray().map(/* ... */);
  }

  async addTodo(todo: Todo): Promise<boolean> {
    // Add data with SQL INSERT statement
  }

  async updateTodo(todo: Todo): Promise<boolean> {
    // Update data with SQL UPDATE statement
  }

  async deleteTodo(id: number): Promise<boolean> {
    // Delete data with SQL DELETE statement
  }
}
```

### How to Retrieve Data from SQL

```typescript
// Execute SQL query using DuckDB
const result = await this.conn.query(`SELECT * FROM todos ORDER BY id`);

// Convert result to array and format types
const todos = result.toArray().map((row: any) => ({
  id: row.id,
  text: row.text,
  done: row.done
}));
```

## Asynchronous Processing

Asynchronous processing in TypeScript is done using `async/await` syntax. If you have SQL experience, the concept of performing database operations asynchronously should be easy to understand.

### Basic Asynchronous Processing

```typescript
// Define async function
async function fetchTodos(): Promise<Todo[]> {
  try {
    // Database operation
    const result = await db.query('SELECT * FROM todos');
    return result;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

// Call async function
async function main() {
  const todos = await fetchTodos();
  console.log(todos);
}
```

### Asynchronous Processing in React Components

```typescript
const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await fetchTodos();
        setTodos(data);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
};
```

## Development Environment Setup

Steps to run this project in a development environment:

```bash
# Clone the repository
git clone https://github.com/yourusername/nextjs-todo-example.git

# Navigate to the directory
cd nextjs-todo-example

# Install dependencies
npm install

# Start development server
npm run dev
```

### Required Tools

1. Node.js (latest LTS version recommended)
2. npm (bundled with Node.js)
3. Code editor (Visual Studio Code recommended)
   - Recommended extensions: ESLint, Prettier, TypeScript

## Learning Resources

Recommended resources for learning TypeScript and Next.js:

### TypeScript
- [TypeScript Official Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### React
- [React Official Documentation](https://react.dev/)
- [React Tutorial](https://react.dev/learn)

### Next.js
- [Next.js Official Documentation](https://nextjs.org/docs)
- [Next.js Tutorial](https://nextjs.org/learn/basics/create-nextjs-app)

## Summary

Learning TypeScript and Next.js can be easier by building on SQL knowledge:

1. **Type System** - SQL table definitions and TypeScript type definitions are conceptually similar
2. **Asynchronous Processing** - If you understand the asynchronous nature of database operations, `async/await` will be easy to understand
3. **Data Flow** - The pattern of retrieving, displaying, and updating data is similar to SQL-based applications

Through this project, you can learn the basics of TypeScript and Next.js and further expand your skills.