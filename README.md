# Next.js TODOアプリ（duck-WASM版）

このプロジェクトは、Next.jsを使用したシンプルなTODOアプリです。データ保存にduck-WASMを使用しています。

## 特徴

- Next.jsによるシンプルなTODOアプリ
- データストレージにduck-WASM（WebAssemblyで動作するDuckDB）を使用
- ブラウザ内でSQLデータベースとして動作
- モダンなUI/UX
- レスポンシブデザイン（スマートフォン対応）
- TypeScriptによる型安全性
- Jestによるユニットテスト

## 使用技術

- Next.js
- React
- DuckDB-WASM
- TypeScript
- SQL
- Jest & Testing Library

## インストール方法

```bash
# リポジトリをクローン
git clone https://github.com/ttekun/nextjs-todo-example.git

# ディレクトリに移動
cd nextjs-todo-example

# 依存関係をインストール
npm install

# DuckDB-WASMファイルをセットアップ
npm run setup

# 開発サーバーを起動（自動的にsetupスクリプトも実行されます）
npm run dev
```

このように設定すると：

1. `public/duckdb-wasm`ディレクトリはGitHubにプッシュされません
2. `npm run setup`で必要なWASMファイルがダウンロードされます
3. `npm run dev`を実行すると自動的にセットアップスクリプトが走ります

この方法でリポジトリサイズを小さく保ちつつ、開発者が簡単にプロジェクトを始められるようになります。

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを使用します。

## テスト実行方法

```bash
# すべてのテストを実行
npm test

# ウォッチモードでテストを実行（開発時に便利）
npm run test:watch
```

## データ構造

TODOデータは以下のSQLテーブル構造で保存されています：

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE
);
```

## 機能

- TODOの追加
- TODOの削除
- TODOの編集
- TODOの完了/未完了の切り替え

## プロジェクト構造

```
/
├── src/                # ソースコードのルートディレクトリ
│   ├── pages/          # Next.jsのルーティング用ページ
│   ├── components/     # 再利用可能なUIコンポーネント
│   ├── services/       # データストレージなどのサービス
│   └── types/          # TypeScriptの型定義
├── public/             # 静的ファイル
├── docs/               # プロジェクトのドキュメント
└── __tests__/          # テストファイル
```

## ドキュメント

プロジェクトに関する詳細なドキュメントは以下のファイルを参照してください：

- [アーキテクチャ概要](docs/duck-wasm-schema.md) - アプリケーションの基本構造とデータフロー
- [TypeScriptとNext.js学習ガイド](docs/typescript-nextjs-learning-guide.md) - TypeScriptとNext.jsの基本的な概念の解説
- [アーキテクチャスキーマ](docs/typescript-nextjs-schema.md) - プロジェクトのアーキテクチャをビジュアルで理解するためのMermaid図
- [トラブルシューティングガイド](docs/troubleshooting-guide.md) - 発生する可能性のある問題と解決策

## 型定義

TypeScriptの型定義は以下のように実装されています：

```typescript
// Todo型
export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// ストレージサービスのインターフェース
export interface StorageService {
  initialize: () => Promise<void>;
  getAllTodos: () => Promise<Todo[]>;
  addTodo: (todo: Todo) => Promise<boolean>;
  deleteTodo: (id: number) => Promise<boolean>;
  updateTodo: (todo: Todo) => Promise<boolean>;
  close: () => Promise<void>;
}
```

## パフォーマンスについて

duck-WASMは初回ロード時にWebAssemblyモジュールをロードするため、やや時間がかかる場合があります。しかし、一度ロードされると、その後の操作はスムーズに行われます。

## ライセンス

MIT 