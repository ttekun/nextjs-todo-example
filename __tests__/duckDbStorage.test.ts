/**
 * Unit tests for DuckDbStorageService.
 *
 * These tests bypass the module-level mock in jest.setup.js by mocking
 * @duckdb/duckdb-wasm at a lower level: the mock conn.query and conn.prepare
 * calls record exactly what SQL and parameters were passed, letting us verify
 * the actual service logic (SQL generation, parameter binding, error handling,
 * initialization guard) rather than just confirming mock return values.
 */

import { Todo } from '../src/types/todo';

// ---------------------------------------------------------------------------
// Low-level mock helpers
// ---------------------------------------------------------------------------

const mockStatementRun = jest.fn().mockResolvedValue({});
const mockStatementClose = jest.fn();
const mockStatementQuery = jest.fn().mockResolvedValue({ toArray: () => [] });

const mockStatement = {
  run: mockStatementRun,
  query: mockStatementQuery,
  close: mockStatementClose,
};

const mockConnQuery = jest.fn();
const mockConnPrepare = jest.fn().mockResolvedValue(mockStatement);
const mockConnClose = jest.fn().mockResolvedValue({});

const mockInstantiate = jest.fn().mockResolvedValue({});
const mockConnect = jest.fn().mockResolvedValue({
  query: mockConnQuery,
  prepare: mockConnPrepare,
  close: mockConnClose,
});
const mockTerminate = jest.fn().mockResolvedValue({});

// Override the global mock from jest.setup.js with a lower-level version
jest.mock('@duckdb/duckdb-wasm', () => ({
  ConsoleLogger: jest.fn().mockImplementation(() => ({})),
  AsyncDuckDB: jest.fn().mockImplementation(() => ({
    instantiate: mockInstantiate,
    connect: mockConnect,
    terminate: mockTerminate,
  })),
}));

// ---------------------------------------------------------------------------
// Import service AFTER mock is set up
// ---------------------------------------------------------------------------

// We import the class indirectly by importing the module and forcing a fresh
// instance each test so singleton state doesn't leak between tests.
let getDuckDbStorage: () => import('../src/types/todo').StorageService;

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();

  // Reset mocks to their default resolved values
  mockConnQuery.mockResolvedValue({});
  mockConnPrepare.mockResolvedValue(mockStatement);
  mockStatementRun.mockResolvedValue({});

  // Re-import to get a fresh singleton
  ({ getDuckDbStorage } = await import('../src/services/duckDbStorage'));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStorage() {
  // Simulate browser environment for the service
  (global as any).window = {
    location: { origin: 'http://localhost' },
  };
  (global as any).Worker = class {
    constructor(_url: string) {}
    terminate() {}
  };
  return getDuckDbStorage();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DuckDbStorageService', () => {
  describe('initialize()', () => {
    test('creates table with correct schema on first call', async () => {
      const storage = makeStorage();

      // Mock DDL query
      mockConnQuery.mockResolvedValue({});

      await storage.initialize();

      // The CREATE TABLE query must reference BIGINT and all three columns
      const [ddlCall] = mockConnQuery.mock.calls;
      const ddlSql: string = ddlCall[0];
      expect(ddlSql).toMatch(/CREATE TABLE IF NOT EXISTS todos/i);
      expect(ddlSql).toMatch(/id\s+BIGINT/i);
      expect(ddlSql).toMatch(/text\s+TEXT/i);
      expect(ddlSql).toMatch(/done\s+BOOLEAN/i);
    });

    test('is idempotent — second call skips re-initialization', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});

      await storage.initialize();
      await storage.initialize();

      // connect() should only have been called once
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    test('resets initPromise on failure so retry is possible', async () => {
      const storage = makeStorage();

      // First call fails
      mockInstantiate.mockRejectedValueOnce(new Error('WASM load failed'));
      await expect(storage.initialize()).rejects.toThrow('WASM load failed');

      // Second call should attempt initialization again (not re-throw cached rejection)
      mockInstantiate.mockResolvedValue({});
      mockConnQuery.mockResolvedValue({});
      await expect(storage.initialize()).resolves.not.toThrow();
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllTodos()', () => {
    test('returns todos mapped from query result rows', async () => {
      const storage = makeStorage();
      mockConnQuery
        .mockResolvedValueOnce({}) // DDL
        .mockResolvedValueOnce({
          toArray: () => [
            { id: 1, text: 'Buy groceries', done: false },
            { id: 2, text: 'Read book', done: true },
          ],
        });

      await storage.initialize();
      const todos = await storage.getAllTodos();

      expect(todos).toHaveLength(2);
      expect(todos[0]).toEqual({ id: 1, text: 'Buy groceries', done: false });
      expect(todos[1]).toEqual({ id: 2, text: 'Read book', done: true });
    });

    test('issues SELECT query ordered by id', async () => {
      const storage = makeStorage();
      mockConnQuery
        .mockResolvedValueOnce({}) // DDL
        .mockResolvedValueOnce({ toArray: () => [] });

      await storage.initialize();
      await storage.getAllTodos();

      const selectCall = mockConnQuery.mock.calls[1];
      expect(selectCall[0]).toMatch(/SELECT \* FROM todos ORDER BY id/i);
    });

    test('returns empty array on query failure', async () => {
      const storage = makeStorage();
      mockConnQuery
        .mockResolvedValueOnce({}) // DDL
        .mockRejectedValueOnce(new Error('query error'));

      await storage.initialize();
      const todos = await storage.getAllTodos();

      expect(todos).toEqual([]);
    });
  });

  describe('addTodo()', () => {
    test('uses prepared statement with correct SQL and binds parameters', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});
      await storage.initialize();

      const todo: Todo = { id: 123, text: 'New task', done: false };
      const result = await storage.addTodo(todo);

      expect(result).toBe(true);
      expect(mockConnPrepare).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO todos \(id, text, done\) VALUES \(\?, \?, \?\)/i)
      );
      expect(mockStatementRun).toHaveBeenCalledWith(123, 'New task', false);
      expect(mockStatementClose).toHaveBeenCalled();
    });

    test('returns false when prepared statement throws', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});
      mockConnPrepare.mockRejectedValueOnce(new Error('constraint violation'));

      await storage.initialize();
      const result = await storage.addTodo({ id: 1, text: 'x', done: false });

      expect(result).toBe(false);
    });
  });

  describe('deleteTodo()', () => {
    test('uses prepared statement with correct SQL and binds id', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});
      await storage.initialize();

      const result = await storage.deleteTodo(42);

      expect(result).toBe(true);
      expect(mockConnPrepare).toHaveBeenCalledWith(
        expect.stringMatching(/DELETE FROM todos WHERE id = \?/i)
      );
      expect(mockStatementRun).toHaveBeenCalledWith(42);
      expect(mockStatementClose).toHaveBeenCalled();
    });

    test('returns false when statement throws', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});
      mockConnPrepare.mockRejectedValueOnce(new Error('delete error'));

      await storage.initialize();
      const result = await storage.deleteTodo(1);

      expect(result).toBe(false);
    });
  });

  describe('updateTodo()', () => {
    test('uses prepared statement with correct SQL and binds all fields', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});
      await storage.initialize();

      const todo: Todo = { id: 7, text: 'Updated text', done: true };
      const result = await storage.updateTodo(todo);

      expect(result).toBe(true);
      expect(mockConnPrepare).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE todos SET text = \?, done = \? WHERE id = \?/i)
      );
      expect(mockStatementRun).toHaveBeenCalledWith('Updated text', true, 7);
      expect(mockStatementClose).toHaveBeenCalled();
    });

    test('returns false when statement throws', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});
      mockConnPrepare.mockRejectedValueOnce(new Error('update error'));

      await storage.initialize();
      const result = await storage.updateTodo({ id: 1, text: 'x', done: false });

      expect(result).toBe(false);
    });
  });

  describe('close()', () => {
    test('closes connection and terminates db', async () => {
      const storage = makeStorage();
      mockConnQuery.mockResolvedValue({});
      await storage.initialize();

      await storage.close();

      expect(mockConnClose).toHaveBeenCalled();
      expect(mockTerminate).toHaveBeenCalled();
    });

    test('does not throw if close is called without initialization', async () => {
      const storage = makeStorage();
      await expect(storage.close()).resolves.not.toThrow();
    });
  });
});
