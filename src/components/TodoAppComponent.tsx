import React, { useEffect, useState } from "react";
import { getDuckDbStorage } from "../services/duckDbStorage";
import { Todo } from "../types/todo";

const TodoAppComponent: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editInput, setEditInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // duck-WASMストレージのインスタンスを取得
  const storage = getDuckDbStorage();

  useEffect(() => {
    // duck-WASMからTODOを読み込む
    const loadTodos = async (): Promise<void> => {
      try {
        console.log("[DEBUG] TodoAppComponent: loadTodos開始");
        
        // duck-WASMの初期化
        console.log("[DEBUG] TodoAppComponent: storage.initialize()を呼び出し");
        await storage.initialize();
        console.log("[DEBUG] TodoAppComponent: storage.initialize()完了");
        
        console.log("[DEBUG] TodoAppComponent: storage.getAllTodos()を呼び出し");
        const storedTodos = await storage.getAllTodos();
        console.log("[DEBUG] TodoAppComponent: storage.getAllTodos()完了", storedTodos);
        
        setTodos(storedTodos);
        console.log("duck-WASMからデータ読み込み成功", storedTodos);
        setIsLoading(false);
      } catch (error) {
        console.error("[DEBUG] TodoAppComponent: エラー発生:", error);
        setError("データの読み込みに失敗しました。");
        setIsLoading(false);
      }
    };

    loadTodos();

    // クリーンアップ関数
    return () => {
      console.log("[DEBUG] TodoAppComponent: クリーンアップ関数実行");
      storage.close().catch(console.error);
    };
  }, []);

  const addTodo = async (): Promise<void> => {
    if (input.trim() === "") return;
    
    // より安全なID生成方法に変更
    // タイムスタンプの下位7桁を使用してINT32の範囲内に収める
    const timestamp = Date.now();
    const safeId = timestamp % 10000000; // 7桁の数値にする
    
    const newTodo: Todo = { id: safeId, text: input.trim(), done: false };

    try {
      const success = await storage.addTodo(newTodo);
      if (success) {
        setTodos([...todos, newTodo]);
        console.log("TODO追加:", newTodo);
      } else {
        console.error("TODOの追加に失敗しました");
      }
    } catch (error) {
      console.error("TODO追加エラー:", error);
    }

    setInput("");
  };

  const deleteTodo = async (id: number): Promise<void> => {
    try {
      const success = await storage.deleteTodo(id);
      if (success) {
        const newTodos = todos.filter(todo => todo.id !== id);
        setTodos(newTodos);
        console.log("TODO削除:", id);
      } else {
        console.error("TODOの削除に失敗しました");
      }
    } catch (error) {
      console.error("TODO削除エラー:", error);
    }
  };

  const toggleTodo = async (id: number): Promise<void> => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;

      const updatedTodo: Todo = { ...todoToUpdate, done: !todoToUpdate.done };
      const success = await storage.updateTodo(updatedTodo);

      if (success) {
        const newTodos = todos.map(todo => {
          if (todo.id === id) {
            console.log("TODO状態切替:", updatedTodo);
            return updatedTodo;
          }
          return todo;
        });
        setTodos(newTodos);
      } else {
        console.error("TODOの状態変更に失敗しました");
      }
    } catch (error) {
      console.error("TODO状態切替エラー:", error);
    }
  };

  // 編集開始
  const startEditing = (id: number, text: string): void => {
    setEditingId(id);
    setEditInput(text);
    console.log("編集開始:", { id, text });
  };

  // 編集保存
  const saveEdit = async (id: number): Promise<void> => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;

      const updatedTodo: Todo = { ...todoToUpdate, text: editInput };
      const success = await storage.updateTodo(updatedTodo);

      if (success) {
        const newTodos = todos.map(todo => {
          if (todo.id === id) {
            console.log("TODO編集保存:", updatedTodo);
            return updatedTodo;
          }
          return todo;
        });
        setTodos(newTodos);
        setEditingId(null);
        setEditInput("");
      } else {
        console.error("TODOの編集に失敗しました");
      }
    } catch (error) {
      console.error("TODO編集保存エラー:", error);
    }
  };

  if (isLoading) {
    return <div className="loading">データを読み込み中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="container">
      <h1>TODOアプリ (duck-WASM版)</h1>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="TODOを入力..."
        />
        <button onClick={addTodo}>追加</button>
      </div>
      <ul className="todo-list">
        {todos.map(todo => (
          <li key={todo.id} className={todo.done ? "done" : ""}>
            {editingId === todo.id ? (
              <>
                <input
                  type="text"
                  value={editInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <div className="actions">
                  <button onClick={() => saveEdit(todo.id)}>保存</button>
                </div>
              </>
            ) : (
              <>
                <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
                <div className="actions">
                  <button onClick={() => startEditing(todo.id, todo.text)}>編集</button>
                  <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>削除</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 2rem auto;
          padding: 2rem;
          background: #15202b;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #e7e9ea;
        }
        h1 {
          text-align: center;
          margin-bottom: 1.5rem;
          font-weight: 700;
          color: #e7e9ea;
        }
        .input-area {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          width: 100%;
          background: #273340;
          border-radius: 9999px;
          padding: 0.5rem;
        }
        .input-area button {
          margin-left: 0;
        }
        input[type="text"] {
          flex: 1;
          padding: 0.75rem;
          font-size: 1rem;
          border: none;
          border-radius: 9999px;
          background: #273340;
          color: #e7e9ea;
          box-shadow: none;
        }
        input[type="text"]::placeholder {
          color: #8899a6;
        }
        input[type="text"]:focus {
          outline: none;
        }
        button {
          background-color: #1d9bf0;
          color: #fff;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: background 0.2s ease;
        }
        button:hover {
          background-color: #1a8cd8;
        }
        .delete-btn {
          background-color: #f4212e;
        }
        .delete-btn:hover {
          background-color: #e0202b;
        }
        .actions {
          display: inline-flex;
          gap: 0.5rem;
        }
        .todo-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .todo-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          margin-bottom: 0.5rem;
          background: #192734;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        .todo-list li:hover {
          background: #22303c;
        }
        .todo-list li.done span {
          text-decoration: line-through;
          color: #8899a6;
        }
        .todo-list li span {
          flex: 1;
          cursor: pointer;
          word-break: break-word;
        }
        .loading, .error {
          text-align: center;
          padding: 2rem;
          font-size: 1.2rem;
          color: #e7e9ea;
        }
        .error {
          color: #f4212e;
        }
      `}</style>
    </div>
  );
};

export default TodoAppComponent; 