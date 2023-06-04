/** @type {import('jest').Config} */
export default {
  verbose: true,
  extensionsToTreatAsEsm: [".jsx", ".mjsx", ".es.test.mjs", ".es.test.mjsx"],
  moduleFileExtensions: ["mjs", "js", "jsx", "mjsx"],
  roots: ["<rootDir>/lib/"],
  transform: {},
//  testRegex: `es\.test\.mjs$`,
  testMatch: ["**/*.es.test.mjs","**/*.es.test.mjsx"],
  moduleDirectories: ["node_modules", "lib"],
  modulePathIgnorePatterns: ["example", ".rollup.cache"],
  collectCoverage: false,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["html", "cobertura", "text"],
  moduleNameMapper: {
    "^debe$": "<rootDir>/lib/core/index.es.mjs",
    "^debe-adapter$": "<rootDir>/lib/adapter/index.es.mjs",
    "^debe-idb$": "<rootDir>/lib/idb/index.es.mjs",
    "^debe-memory$": "<rootDir>/lib/memory/index.es.mjs",
    "^debe-sql$": "<rootDir>/lib/sql/index.es.mjs",
    "^debe-http$": "<rootDir>/lib/http/index.es.mjs",
    "^debe-http-server$": "<rootDir>/lib/http-server/index.es.mjs",
    "^debe-better-sqlite3$": "<rootDir>/lib/better-sqlite3/index.es.mjs",
    "^debe-postgresql$": "<rootDir>/lib/postgresql/index.es.mjs",
    "^debe-delta$": "<rootDir>/lib/delta/index.es.mjs",
    "^debe-socket$": "<rootDir>/lib/socket/index.es.mjs",
    "^debe-socket-server$": "<rootDir>/lib/socket-server/index.es.mjs",
    "^debe-sync$": "<rootDir>/lib/sync/index.es.mjs",
    "^debe-sync-server$": "<rootDir>/lib/sync-server/index.es.mjs",
    "^debe-react$": "<rootDir>/lib/react/index.es.mjs",
    "^debe-react-server$": "<rootDir>/lib/react-server/index.es.mjs",
  },

};