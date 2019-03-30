// jest.config.js
module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.json'
    }
  },
  modulePathIgnorePatterns: ['lib'],
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageReporters: ['html', 'cobertura', 'text']
};
