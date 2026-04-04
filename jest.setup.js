// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock prepared statement returned by conn.prepare()
const mockStatement = {
  run: jest.fn().mockResolvedValue({}),
  query: jest.fn().mockResolvedValue({ toArray: () => [] }),
  close: jest.fn(),
};

jest.mock('@duckdb/duckdb-wasm', () => {
  return {
    ConsoleLogger: jest.fn().mockImplementation(() => ({})),
    AsyncDuckDB: jest.fn().mockImplementation(() => ({
      instantiate: jest.fn().mockResolvedValue({}),
      connect: jest.fn().mockResolvedValue({
        // Direct query used only for DDL (CREATE TABLE IF NOT EXISTS) and SELECT
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes('SELECT')) {
            return Promise.resolve({
              toArray: () => [
                { id: 1, text: 'Test TODO 1', done: false },
                { id: 2, text: 'Test TODO 2', done: true }
              ]
            });
          }
          return Promise.resolve({});
        }),
        // Prepared statement API used for INSERT, UPDATE, DELETE
        prepare: jest.fn().mockResolvedValue(mockStatement),
        close: jest.fn().mockResolvedValue({}),
      }),
      terminate: jest.fn().mockResolvedValue({}),
    })),
  };
});

// Global Worker mock required for DuckDB-WASM
global.Worker = class {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }

  postMessage(msg) {
    this.onmessage({ data: { id: 'test', result: {} } });
  }

  terminate() {}
};

// Mock fetch for WASM file existence checks
global.fetch = jest.fn().mockResolvedValue({ status: 200 });
