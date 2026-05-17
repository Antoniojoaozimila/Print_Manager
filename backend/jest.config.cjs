module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.js', '!src/migrations/**', '!src/seeders/**'],
  coverageDirectory: 'coverage',
  testTimeout: 15000,
};

