import { getDuckDbStorage } from '../src/services/duckDbStorage';
import { Todo } from '../src/types/todo';

describe('DuckDbStorageService', () => {
  let storage: ReturnType<typeof getDuckDbStorage>;
  
  beforeEach(() => {
    // Initialize storage service before each test
    storage = getDuckDbStorage();
  });
  
  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
  
  test('initialize() should work correctly', async () => {
    await expect(storage.initialize()).resolves.not.toThrow();
  });
  
  test('getAllTodos() should return correct TODO list', async () => {
    await storage.initialize();
    const todos = await storage.getAllTodos();
    
    expect(todos).toHaveLength(2);
    expect(todos[0]).toHaveProperty('id', 1);
    expect(todos[0]).toHaveProperty('text', 'テストTODO 1');
    expect(todos[0]).toHaveProperty('done', false);
    
    expect(todos[1]).toHaveProperty('id', 2);
    expect(todos[1]).toHaveProperty('text', 'テストTODO 2');
    expect(todos[1]).toHaveProperty('done', true);
  });
  
  test('addTodo() should work correctly', async () => {
    await storage.initialize();
    
    const newTodo: Todo = {
      id: 3,
      text: '新しいTODO',
      done: false
    };
    
    const result = await storage.addTodo(newTodo);
    expect(result).toBe(true);
  });
  
  test('deleteTodo() should work correctly', async () => {
    await storage.initialize();
    
    const result = await storage.deleteTodo(1);
    expect(result).toBe(true);
  });
  
  test('updateTodo() should work correctly', async () => {
    await storage.initialize();
    
    const updatedTodo: Todo = {
      id: 1,
      text: '更新されたTODO',
      done: true
    };
    
    const result = await storage.updateTodo(updatedTodo);
    expect(result).toBe(true);
  });
  
  test('close() should work correctly', async () => {
    await storage.initialize();
    await expect(storage.close()).resolves.not.toThrow();
  });
}); 