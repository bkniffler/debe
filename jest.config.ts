import type { Config } from "jest";

const config: Config = {
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  verbose: true,
  preset: "ts-jest/presets/default-esm",
  moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
  transform: {
    "^.+\\.m?[tj]sx?$": [
      "ts-jest",
      {
        useESM: true,
        diagnostics: {
          ignoreCodes: [2571, 6031, 18003, 151001],
        },
        tsconfig: "./tsconfig.test.json",
      },
    ],
  },
  modulePathIgnorePatterns: ["example", "lib", ".rollup.cache"],
  collectCoverage: false,
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["html", "cobertura", "text"],
};

export default config;
