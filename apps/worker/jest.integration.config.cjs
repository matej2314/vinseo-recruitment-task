/** @type {import('jest').Config} */
const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  testRegex: '.*\\.integration\\.spec\\.ts$',
  testPathIgnorePatterns: [],
};
