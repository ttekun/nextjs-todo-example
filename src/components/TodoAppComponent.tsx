import React, { useEffect, useState } from "react";
import { getDuckDbStorage } from "../services/duckDbStorage";
import { Todo } from "../types/todo";

const MAX_TODO_LENGTH = 500;

const TodoAppComponent: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editInput, setEditInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Get duck-WASM storage instance
  const storage = getDuckDbStorage();

  useEffect(() => {
    // Load TODOs from duck-WASM
    const loadTodos = async (): Promise<void> => {
      try {
        await storage.initialize();
        const storedTodos = await storage.getAllTodos();
        setTodos(storedTodos);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load todos:", error);
        setError("Failed to load data.");
        setIsLoading(false);
      }
    };

    loadTodos();

    // Cleanup function
    return () => {
      storage.close().catch(console.error);
    };
  }, []);

  const clearOperationError = () => {
    setOperationError(null);
  };

  const addTodo = async (): Promise<void> => {
    if (input.trim() === "") return;

    // Input validation
    if (input.trim().length > MAX_TODO_LENGTH) {
      setOperationError(`TODO must be within ${MAX_TODO_LENGTH} characters.`);
      return;
    }

    // Generate unique ID using timestamp + random suffix to prevent collisions
    const safeId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const newTodo: Todo = { id: safeId, text: input.trim(), done: false };

    try {
      const success = await storage.addTodo(newTodo);
      if (success) {
        setTodos([...todos, newTodo]);
        setInput("");
        clearOperationError();
      } else {
        setOperationError("Failed to add TODO.");
      }
    } catch (error) {
      console.error("Failed to add todo:", error);
      setOperationError("Failed to add TODO.");
    }
  };

  const deleteTodo = async (id: number): Promise<void> => {
    try {
      const success = await storage.deleteTodo(id);
      if (success) {
        const newTodos = todos.filter(todo => todo.id !== id);
        setTodos(newTodos);
        clearOperationError();
      } else {
        setOperationError("Failed to delete TODO.");
      }
    } catch (error) {
      console.error("Failed to delete todo:", error);
      setOperationError("Failed to delete TODO.");
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
            return updatedTodo;
          }
          return todo;
        });
        setTodos(newTodos);
        clearOperationError();
      } else {
        setOperationError("Failed to change TODO status.");
      }
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      setOperationError("Failed to change TODO status.");
    }
  };

  // Start editing
  const startEditing = (id: number, text: string): void => {
    setEditingId(id);
    setEditInput(text);
    clearOperationError();
  };

  // Save edit
  const saveEdit = async (id: number): Promise<void> => {
    // Input validation
    if (editInput.trim().length > MAX_TODO_LENGTH) {
      setOperationError(`TODO must be within ${MAX_TODO_LENGTH} characters.`);
      return;
    }

    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;

      const updatedTodo: Todo = { ...todoToUpdate, text: editInput.trim() };
      const success = await storage.updateTodo(updatedTodo);

      if (success) {
        const newTodos = todos.map(todo => {
          if (todo.id === id) {
            return updatedTodo;
          }
          return todo;
        });
        setTodos(newTodos);
        setEditingId(null);
        setEditInput("");
        clearOperationError();
      } else {
        setOperationError("Failed to edit TODO.");
      }
    } catch (error) {
      console.error("Failed to save edit:", error);
      setOperationError("Failed to edit TODO.");
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
      {operationError && (
        <div className="operation-error">
          {operationError}
          <button className="dismiss-btn" onClick={clearOperationError}>×</button>
        </div>
      )}
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") addTodo();
          }}
          placeholder="TODOを入力..."
          maxLength={MAX_TODO_LENGTH}
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
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") saveEdit(todo.id);
                  }}
                  style={{ flex: 1 }}
                  maxLength={MAX_TODO_LENGTH}
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
        .operation-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          background: #4a1a1a;
          border: 1px solid #f4212e;
          border-radius: 8px;
          color: #f4212e;
          font-size: 0.9rem;
        }
        .dismiss-btn {
          background: transparent;
          border: none;
          color: #f4212e;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          margin-left: 0.5rem;
          line-height: 1;
        }
        .dismiss-btn:hover {
          background: transparent;
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