# TypeScriptとNext.jsアーキテクチャ

このドキュメントでは、TypeScriptとNext.jsを使用したTODOアプリのアーキテクチャ概要を説明します。

## 全体アーキテクチャ

```mermaid
graph TD
    A[クライアント] --> B[Next.jsアプリケーション]
    B --> C[Reactコンポーネント]
    C --> D[TypeScript型システム]
    C --> E[duck-WASMストレージ]
    E --> F[SQLデータベース]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
    style E fill:#bff,stroke:#333,stroke-width:2px
    style F fill:#ffb,stroke:#333,stroke-width:2px
```

## コンポーネント構成

```mermaid
graph TD
    A[pages/index.tsx] --> B[TodoAppComponent]
    B --> C[Reactフック]
    C --> D[useState]
    C --> E[useEffect]
    B --> F[TODOアイテム表示]
    B --> G[CRUD操作]
    G --> H[追加]
    G --> I[削除]
    G --> J[更新]
    G --> K[完了切替]
    B --> L[DuckDbStorageService]
    L --> M[duck-WASM]
    M --> N[SQLクエリ実行]

    style A fill:#bbf,stroke:#333,stroke-width:2px
    style B fill:#bfb,stroke:#333,stroke-width:2px
    style C fill:#fbb,stroke:#333,stroke-width:2px
    style L fill:#bff,stroke:#333,stroke-width:2px
    style N fill:#ffb,stroke:#333,stroke-width:2px
```

## データフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as UIコンポーネント
    participant Logic as ロジックレイヤー
    participant Storage as DuckDbStorage
    participant DB as SQLデータベース
    
    User->>UI: TODOの追加/編集/削除
    UI->>Logic: アクション実行
    Logic->>Storage: データ操作リクエスト
    Storage->>DB: SQLクエリ実行
    DB-->>Storage: クエリ結果
    Storage-->>Logic: 操作結果
    Logic-->>UI: 状態更新
    UI-->>User: UI更新
```

## 型システム

```mermaid
classDiagram
    class Todo {
        +number id
        +string text
        +boolean done
    }
    
    class StorageService {
        +initialize() Promise~void~
        +getAllTodos() Promise~Todo[]~
        +addTodo(Todo) Promise~boolean~
        +deleteTodo(number) Promise~boolean~
        +updateTodo(Todo) Promise~boolean~
        +close() Promise~void~
    }
    
    class DuckDbStorageService {
        -any db
        -any conn
        -boolean initialized
        -Promise~any~ initPromise
        +initialize() Promise~void~
        +getAllTodos() Promise~Todo[]~
        +addTodo(Todo) Promise~boolean~
        +deleteTodo(number) Promise~boolean~
        +updateTodo(Todo) Promise~boolean~
        +close() Promise~void~
    }
    
    StorageService <|.. DuckDbStorageService : implements
    DuckDbStorageService ..> Todo : uses
```

## データベーススキーマ

```mermaid
erDiagram
    TODOS {
        integer id PK
        string text
        boolean done
    }
```

## 技術スタック概要

| レイヤー | 使用技術 | 役割 |
|----------|----------|------|
| フロントエンド | React, TypeScript | UIの構築、型安全なコード |
| アプリケーションフレームワーク | Next.js | ルーティング、SSR(無効化) |
| データストレージ | duck-WASM (DuckDB) | ブラウザ内SQLデータベース |
| テスト | Jest, Testing Library | ユニットテスト、コンポーネントテスト |

## 問題の可能性と解決策

このアーキテクチャで発生する可能性がある問題と解決策：

1. **duck-WASM初期化の失敗**
   - 原因: ブラウザの互換性、メモリ制限
   - 解決策: エラーハンドリングの強化、フォールバックストレージの実装

2. **非同期処理のハンドリング不足**
   - 原因: Promise処理の不適切な実装
   - 解決策: async/awaitパターンの適切な使用、エラーハンドリング改善

3. **SQLクエリのエラー**
   - 原因: 構文ミス、トランザクション問題
   - 解決策: クエリテスト、エラーログ強化

4. **パフォーマンス問題**
   - 原因: 頻繁なレンダリング、非効率なクエリ
   - 解決策: メモ化、最適化されたクエリ

5. **ブラウザストレージの制限**
   - 原因: ローカルストレージの容量制限
   - 解決策: データサイズの監視、不要データの削除 