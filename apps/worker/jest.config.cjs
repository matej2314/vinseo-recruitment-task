/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  // Integracja (Postgres vinseo_test): `pnpm test:integration` / jest.integration.config.cjs
  testPathIgnorePatterns: ['\\.integration\\.spec\\.ts$'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@nestjs/config$': '<rootDir>/test/nestjs-config-shim.cjs',
    '^@vinseo/contracts$':
      '<rootDir>/../../packages/contracts/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
