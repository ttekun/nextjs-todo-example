// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// モックの設定
jest.mock('@duckdb/duckdb-wasm', () => {
  return {
    // DuckDBのモック
    ConsoleLogger: jest.fn().mockImplementation(() => ({
      // 必要に応じてメソッドを追加
    })),
    AsyncDuckDB: jest.fn().mockImplementation(() => ({
      instantiate: jest.fn().mockResolvedValue({}),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockImplementation((query, params) => {
          // クエリに応じてモックデータを返す
          if (query.includes('SELECT')) {
            return {
              toArray: () => [
                { id: 1, text: 'テストTODO 1', done: false },
                { id: 2, text: 'テストTODO 2', done: true }
              ]
            };
          }
          return {};
        }),
        close: jest.fn().mockResolvedValue({}),
      }),
      terminate: jest.fn().mockResolvedValue({}),
    })),
  };
});

// グローバルなモック
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