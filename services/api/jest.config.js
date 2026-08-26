/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleNameMapper: {
    '^ts-jest$': '<rootDir>/../../node_modules/.pnpm/ts-jest@29.4.9_@babel+core@7.29.0_@jest+transform@30.3.0_@jest+types@30.3.0_babel-jest@_23276cbe3913c139eb8ca90df822deb7/node_modules/ts-jest',
    // expo-server-sdk ships ESM-only builds that Jest cannot parse;
    // substitute a runtime stub (real types still resolve from node_modules)
    '^expo-server-sdk$': '<rootDir>/src/__tests__/__mocks__/expo-server-sdk.js',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
};
