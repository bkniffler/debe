/** @type {import('jest').Config} */
const config = {
  verbose: true,
  roots: ["<rootDir>/lib/"],
  transform: {},
  testMatch: ["**/*.cjs.test.js"],
  moduleDirectories: ["node_modules", "lib"],
  modulePathIgnorePatterns: ["example", ".rollup.cache"],
  collectCoverage: false,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["html", "cobertura", "text"],
  moduleNameMapper: {
    "^debe$": "<rootDir>/lib/core/index.cjs.js",
    "^debe-adapter$": "<rootDir>/lib/adapter/index.cjs.js",
    "^debe-idb$": "<rootDir>/lib/idb/index.cjs.js",
    "^debe-memory$": "<rootDir>/lib/memory/index.cjs.js",
    "^debe-sql$": "<rootDir>/lib/sql/index.cjs.js",
    "^debe-http$": "<rootDir>/lib/http/index.cjs.js",
    "^debe-http-server$": "<rootDir>/lib/http-server/index.cjs.js",
    "^debe-better-sqlite3$": "<rootDir>/lib/better-sqlite3/index.cjs.js",
    "^debe-postgresql$": "<rootDir>/lib/postgresql/index.cjs.js",
    "^debe-delta$": "<rootDir>/lib/delta/index.cjs.js",
    "^debe-socket$": "<rootDir>/lib/socket/index.cjs.js",
    "^debe-socket-server$": "<rootDir>/lib/socket-server/index.cjs.js",
    "^debe-sync$": "<rootDir>/lib/sync/index.cjs.js",
    "^debe-sync-server$": "<rootDir>/lib/sync-server/index.cjs.js",
    "^debe-react$": "<rootDir>/lib/react/index.cjs.js",
    "^debe-react-server$": "<rootDir>/lib/react-server/index.cjs.js",
  },
};

module.exports = config;
