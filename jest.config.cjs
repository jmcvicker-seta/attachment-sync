// Backend-only app — no frontend project needed.
// All tests run in the Node environment matching the Forge resolver runtime.
const sharedConfig = {
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { useESM: false }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Transform ESM-only packages (e.g. uuid) so Jest can process them
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  // @forge/testing-framework shims — fake @forge/* modules for local testing
  moduleNameMapper: {
    '^@forge/api$': '<rootDir>/.testing-framework/dist/shims/forge-api/index.js',
    '^@forge/kvs$': '<rootDir>/.testing-framework/dist/shims/forge-kvs/index.js',
    '^@forge/bridge$': '<rootDir>/.testing-framework/dist/shims/forge-bridge/index.js',
    '^@forge/jira-bridge$': '<rootDir>/.testing-framework/dist/shims/forge-jira-bridge/index.js',
    '^@forge/react$': '<rootDir>/.testing-framework/dist/shims/forge-react/index.js',
    '^@forge/react/jira$': '<rootDir>/.testing-framework/dist/shims/forge-react-jira/index.js',
    '^@forge/resolver$': '<rootDir>/.testing-framework/dist/shims/forge-resolver/index.js',
    '^@forge/events$': '<rootDir>/.testing-framework/dist/shims/forge-events/index.js',
    '^@forge/testing-framework$': '<rootDir>/.testing-framework/dist/index.js',
  },
};

/** @type {import('jest').Config} */
module.exports = {
  collectCoverageFrom: ['src/**/*.(ts|tsx)', '!src/**/*.d.ts', '!src/types/**'],
  // AGENTS ARE NOT AUTHORIZED TO CHANGE THE COVERAGE THRESHOLDS
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    './src/resolvers/**': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    // No frontend in this backend-only app
  },
  projects: [
    {
      ...sharedConfig,
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/resolvers/**/__tests__/**/*.(ts|tsx|js)',
        '<rootDir>/src/resolvers/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/src/__tests__/**/*.(ts|tsx|js)',
        '<rootDir>/src/__tests__/**/*.(test|spec).(ts|tsx|js)',
      ],
    },
  ],
};
