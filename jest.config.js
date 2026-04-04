const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Directory containing next.config.js and .env files for the test environment
  dir: './',
});

// Custom Jest configuration
const customJestConfig = {
  // Pattern for test files
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  // Setup file executed after the test framework is installed
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Test environment
  testEnvironment: 'jest-environment-jsdom',
  // Module name aliases
  moduleNameMapper: {
    // Mock CSS, images, and other static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};

// Merge with the config provided by next/jest
module.exports = createJestConfig(customJestConfig);
