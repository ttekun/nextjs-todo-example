# TypeScriptとNext.js学習ガイド

このドキュメントは、SQLの経験はあるがTypeScriptとNext.jsの経験がないソフトウェアエンジニア向けの学習ガイドです。このTODOアプリプロジェクトを例に、TypeScriptとNext.jsの基本を説明します。

## 目次

1. [TypeScriptの基本](#typescript-の基本)
2. [React入門](#react入門)
3. [Next.jsフレームワーク](#nextjs-フレームワーク)
4. [プロジェクト構造](#プロジェクト構造)
5. [データの扱い方](#データの扱い方)
6. [非同期処理](#非同期処理)
7. [開発環境のセットアップ](#開発環境のセットアップ)
8. [学習リソース](#学習リソース)

## TypeScriptの基本

TypeScriptはJavaScriptのスーパーセットで、静的型付けを提供します。SQLに慣れていれば、型の概念は親しみやすいでしょう。

### 型定義の基本

```typescript
// プリミティブ型
let id: number = 1;
let name: string = "タスク";
let completed: boolean = false;

// 配列
let tasks: string[] = ["タスク1", "タスク2"];

// オブジェクト
let task: { id: number; name: string } = { id: 1, name: "タスク" };

// 型エイリアス
type Task = {
  id: number;
  name: string;
  completed: boolean;
};

// インターフェース（このプロジェクトで使われている方法）
interface Todo {
  id: number;
  text: string;
  done: boolean;
}
```

### プロジェクトでの型定義の例

このプロジェクトでは、`types/todo.ts`ファイルで型定義を行っています：

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

### SQLとの類似点

SQLのテーブル定義とTypeScriptの型定義は似ています：

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

この対応関係は直感的に理解しやすいでしょう。

## React入門

ReactはUIを構築するためのJavaScriptライブラリです。コンポーネントベースのアプローチを取ります。

### コンポーネントの基本

```typescript
import React from 'react';

// 関数コンポーネント
const TaskItem: React.FC<{ task: Todo }> = ({ task }) => {
  return (
    <div>
      <h3>{task.text}</h3>
      <p>完了: {task.done ? 'はい' : 'いいえ'}</p>
    </div>
  );
};

export default TaskItem;
```

### フックの使用

Reactでは「フック」という機能を使ってコンポーネントに状態やライフサイクルの機能を追加します：

```typescript
import React, { useState, useEffect } from 'react';

const TodoList: React.FC = () => {
  // 状態管理
  const [todos, setTodos] = useState<Todo[]>([]);
  
  // ライフサイクル（コンポーネントのマウント時に実行）
  useEffect(() => {
    // データを読み込む処理
    async function loadTodos() {
      const data = await fetchTodos();
      setTodos(data);
    }
    
    loadTodos();
  }, []); // 空の配列を渡すと、コンポーネントのマウント時にのみ実行
  
  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
};
```

## Next.jsフレームワーク

Next.jsはReactベースのフレームワークで、ルーティング、サーバーサイドレンダリング、静的サイト生成などの機能を提供します。

### ページの基本構造

Next.jsでは、`pages`ディレクトリ内のファイルが自動的にルーティングされます：

```typescript
// pages/index.tsx
import React from "react";
import dynamic from 'next/dynamic';

// サーバーサイドレンダリングを無効化したコンポーネント
const TodoAppWithNoSSR = dynamic(
  () => import('./TodoAppComponent'),
  { ssr: false }
);

const IndexPage: React.FC = () => {
  return <TodoAppWithNoSSR />;
};

export default IndexPage;
```

### クライアントサイドのみの処理

WebAssembly（このプロジェクトではduck-WASM）を使う場合、サーバーサイドでは動作しないため、クライアントサイドのみで実行するように設定します：

```typescript
// サーバーサイドでの実行を避ける条件分岐
if (typeof window !== 'undefined') {
  // クライアントサイドでのみ実行されるコード
}

// dynamic importでSSRを無効化
const ComponentWithNoSSR = dynamic(
  () => import('./Component'),
  { ssr: false }
);
```

## プロジェクト構造

Next.jsプロジェクトの基本構造は以下の通りです：

```
/
├── pages/              # ルーティングされるページ
│   ├── _app.tsx        # アプリのグローバル設定
│   ├── index.tsx       # ルートページ（/）
│   └── ...
├── public/             # 静的ファイル
├── styles/             # CSSファイル
├── components/         # 再利用可能なコンポーネント
├── types/              # 型定義
├── package.json        # 依存関係と設定
└── tsconfig.json       # TypeScript設定
```

このTODOアプリの場合：

```
/
├── pages/
│   ├── index.tsx         # メインページ
│   ├── TodoAppComponent.tsx  # TODOアプリのメインロジック
│   ├── duckDbStorage.ts  # データストレージの実装
│   └── _app.tsx          # アプリ全体の設定
├── types/
│   └── todo.ts           # TODOの型定義
├── public/
│   └── duckdb-wasm/      # WebAssemblyファイル
└── ...
```

## データの扱い方

このプロジェクトでは、データの保存にduck-WASM（WebAssemblyで動作するDuckDB）を使用しています。

### データストレージの実装

```typescript
class DuckDbStorageService implements StorageService {
  // プロパティ
  private db: any;
  private conn: any;
  private initialized: boolean;
  
  // 初期化メソッド
  async initialize(): Promise<void> {
    // WebAssemblyデータベースの初期化
    // テーブルの作成
  }
  
  // データ操作メソッド
  async getAllTodos(): Promise<Todo[]> {
    // SQLクエリの実行
    const result = await this.conn.query(`SELECT * FROM todos ORDER BY id`);
    return result.toArray().map(/* ... */);
  }
  
  async addTodo(todo: Todo): Promise<boolean> {
    // SQLのINSERT文でデータを追加
  }
  
  async updateTodo(todo: Todo): Promise<boolean> {
    // SQLのUPDATE文でデータを更新
  }
  
  async deleteTodo(id: number): Promise<boolean> {
    // SQLのDELETE文でデータを削除
  }
}
```

### SQLからデータを取得する方法

```typescript
// DuckDBを使ったSQLクエリの実行
const result = await this.conn.query(`SELECT * FROM todos ORDER BY id`);

// 結果を配列に変換し、型を整える
const todos = result.toArray().map((row: any) => ({
  id: row.id,
  text: row.text,
  done: row.done
}));
```

## 非同期処理

TypeScriptでの非同期処理は、`async/await`構文を使って行います。SQLの経験がある方なら、データベース操作を非同期で行う概念は理解しやすいでしょう。

### 基本的な非同期処理

```typescript
// 非同期関数の定義
async function fetchTodos(): Promise<Todo[]> {
  try {
    // データベース操作
    const result = await db.query('SELECT * FROM todos');
    return result;
  } catch (error) {
    console.error("エラー:", error);
    return [];
  }
}

// 非同期関数の呼び出し
async function main() {
  const todos = await fetchTodos();
  console.log(todos);
}
```

### Reactコンポーネントでの非同期処理

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
        setError("データの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;
  
  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
};
```

## 開発環境のセットアップ

このプロジェクトを開発環境で実行するための手順：

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/nextjs-todo-example.git

# ディレクトリに移動
cd nextjs-todo-example

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### 必要なツール

1. Node.js（最新のLTSバージョン推奨）
2. npm（Node.jsにバンドルされています）
3. コードエディタ（Visual Studio Codeが推奨）
   - 推奨拡張機能：ESLint, Prettier, TypeScript

## 学習リソース

TypeScriptとNext.jsを学ぶための推奨リソース：

### TypeScript
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [TypeScriptチュートリアル（日本語）](https://typescript-jp.gitbook.io/deep-dive/)

### React
- [React公式ドキュメント](https://ja.reactjs.org/docs/getting-started.html)
- [Reactチュートリアル](https://ja.reactjs.org/tutorial/tutorial.html)

### Next.js
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Next.jsチュートリアル](https://nextjs.org/learn/basics/create-nextjs-app)

## まとめ

TypeScriptとNext.jsの学習は、SQLの知識をベースにすることで進めやすくなります：

1. **型システム** - SQLのテーブル定義とTypeScriptの型定義は概念的に似ています
2. **非同期処理** - データベース操作の非同期性の理解があれば、`async/await`も理解しやすいでしょう
3. **データの流れ** - データの取得・表示・更新のパターンはSQLを使ったアプリケーションと似ています

このプロジェクトを通して、TypeScriptとNext.jsの基本を学び、さらに発展させていくことができます。 