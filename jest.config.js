/** @type {import('jest').Config} */
const config = {
    verbose: true,
    testEnvironment: "jsdom",
    roots: ["<rootDir>/lib/"],
    transform: {},
    testMatch: ["**/*.umd.test.js"],
    moduleDirectories: ["node_modules", "lib"],
    modulePathIgnorePatterns: ["example", ".rollup.cache"],
    collectCoverage: false,
    collectCoverageFrom: ["src/**/*.ts"],
    coverageReporters: ["html", "cobertura", "text"],
    moduleNameMapper: {
      "^debe$": "<rootDir>/lib/core/index.umd.js",
      "^debe-adapter$": "<rootDir>/lib/adapter/index.umd.js",
      "^debe-idb$": "<rootDir>/lib/idb/index.umd.js",
      "^debe-memory$": "<rootDir>/lib/memory/index.umd.js",
      "^debe-sql$": "<rootDir>/lib/sql/index.cjs.js",
      "^debe-http$": "<rootDir>/lib/http/index.umd.js",
      "^debe-http-server$": "<rootDir>/lib/http-server/index.cjs.js",
      "^debe-better-sqlite3$": "<rootDir>/lib/better-sqlite3/index.cjs.js",
      "^debe-postgresql$": "<rootDir>/lib/postgresql/index.cjs.js",
      "^debe-delta$": "<rootDir>/lib/delta/index.umd.js",
      "^debe-socket$": "<rootDir>/lib/socket/index.umd.js",
      "^debe-socket-server$": "<rootDir>/lib/socket-server/index.cjs.js",
      "^debe-sync$": "<rootDir>/lib/sync/index.umd.js",
      "^debe-sync-server$": "<rootDir>/lib/sync-server/index.cjs.js",
      "^debe-react$": "<rootDir>/lib/react/index.umd.js",
      "^debe-react-server$": "<rootDir>/lib/react-server/index.cjs.js",
    },
  };
  
  module.exports = config;
  