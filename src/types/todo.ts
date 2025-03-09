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