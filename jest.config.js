const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // next.config.jsとテスト環境用の.envファイルが配置されたディレクトリをセット
  dir: './',
});

// Jestのカスタム設定を設置する場所
const customJestConfig = {
  // テストファイルのパターンを指定
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  // テスト環境のセットアップファイル
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // テスト環境
  testEnvironment: 'jest-environment-jsdom',
  // モジュール名のエイリアス
  moduleNameMapper: {
    // CSS、画像などのモックを設定
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};

// createJestConfigを定義することによって、next/jestが提供する設定とマージする
module.exports = createJestConfig(customJestConfig); 