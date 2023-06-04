import ts from "rollup-plugin-ts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import buildIns from "rollup-plugin-node-builtins";
import replace from "@rollup/plugin-replace";
import autoExternal from "rollup-plugin-auto-external";
import alias from "@rollup/plugin-alias";
import json from "@rollup/plugin-json";
import wasm from "@rollup/plugin-wasm";
import { join } from "path";

import fs from "fs";
const integrate = ["debe", "debe-sql", "debe-adapter"];

import tsconfig from "./tsconfig.json" assert { type: "json" };
import mainPackageJSON from "./package.json" assert { type: "json" };

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// destination.txt will be created or overwritten by default.
const jobs = [];
const paths = tsconfig.compilerOptions.paths;
delete paths["*"];

if (!fs.existsSync(join(__dirname, "lib"))) {
  fs.mkdirSync(join(__dirname, "lib"));
}

await Promise.all(
  Object.keys(paths).map(async (key) => {
    const src = join(__dirname, paths[key][0]);
    const lib = join(__dirname, paths[key][0].replace("/src", "/lib"));

    if (!fs.existsSync(lib)) {
      fs.mkdirSync(lib);
    }

    const packageJSONIn = await import(join(src, "package.json"), {
      assert: {
        type: "json",
      },
    });

    const packageJSON = { ...packageJSONIn.default };
    if (!packageJSON.dependencies) {
      packageJSON.dependencies = {};
    }
    if (fs.existsSync(join(src, "README.md"))) {
      fs.copyFileSync(join(src, "README.md"), join(lib, "README.md"));
    } else {
      fs.writeFileSync(
        join(lib, "README.md"),
        `Find out more on ${mainPackageJSON.repository.url.replace(".git", "")}`
      );
    }
    fs.writeFileSync(
      join(lib, "package.json"),
      JSON.stringify(
        {
          ...packageJSON,
          main: "./index.cjs.js",
          browser: packageJSON.browser !== false ? "./index.umd.js" : undefined,
          esnext: "./index.es.mjs",
          module: "./index.es.mjs",
          types: "./index.d.js",
          publishConfig: {
            access: "public",
          },
          version: mainPackageJSON.version,
          license: mainPackageJSON.license,
          keywords: mainPackageJSON.keywords,
          author: mainPackageJSON.author,
          bugs: mainPackageJSON.bugs,
          repository: mainPackageJSON.repository,
          dependencies: {
            ...Object.keys(packageJSON.dependencies).reduce((store, key) => {
              if (Object.keys(paths).indexOf(key) !== -1) {
                store[key] = mainPackageJSON.version;
              }
              return store;
            }, packageJSON.dependencies),
            tslib: "^2.5.2",
          },
        },
        null,
        2
      )
    );
    jobs.push({
      context: "{}",
      input: join(src, "index.ts"),
      external: [
        ...Object.keys(paths),
        "react",
        "idb/with-async-ittr",
        "idb/with-async-ittr-cjs",
      ],
      output: [
        { file: join(lib, "index.cjs.js"), format: "cjs" },
        { file: join(lib, "index.es.mjs"), format: "es" },
      ],
      plugins: [
        ts({
          transpiler: "swc",
        }),
        resolve(),
        commonjs(),
        autoExternal({
          packagePath: join(lib, "package.json"),
        }),
        json(),
        wasm(),
      ],
    });
    if (packageJSON.browser !== false) {
      jobs.push({
        context: "{}",
        input: join(src, "index.ts"),
        output: {
          name: "debe",
          file: join(lib, "index.umd.js"),
          format: "umd",
          extend: true,
          globals: Object.keys(paths).reduce(
            (state, k) => {
              state[k] = "debe";
              return state;
            },
            {
              react: "React",
            }
          ),
        },
        external: [
          ...Object.keys(paths).filter((x) => integrate.indexOf(x) === -1),
          "react",
        ],
        plugins: [
          ts(),
          replace({
            values: {
              "process.env.NODE_ENV": JSON.stringify("production"),
            },
            preventAssignment: true,
          }),
          buildIns(),
          alias(
            integrate.reduce(
              (state, key) => ({
                ...state,
                [key]: join(
                  __dirname,
                  paths[key][0].replace("/src", "/lib"),
                  "index.js"
                ),
              }),
              {}
            )
          ),
          json(),
          wasm(),
          resolve({ browser: true }),
          commonjs({
            include: [/node_modules/],
          }),
        ],
      });
    }

    if (fs.existsSync(join(src, "index.test.ts"))) {
      jobs.push({
        context: "{}",
        input: join(src, "index.test.ts"),
        external: [...Object.keys(paths), "react", "idb/with-async-ittr-cjs"],
        output: [
          { file: join(lib, "index.cjs.test.js"), format: "cjs" },
          { file: join(lib, "index.es.test.mjs"), format: "es" },
        ],
        plugins: [
          ts({
            tsconfig: "tsconfig.test.json",
          }),
          resolve(),
          commonjs(),
          autoExternal({
            packagePath: join(lib, "package.json"),
          }),
          json(),
          wasm(),
        ],
      });
      if (
        packageJSON.browser !== false
        /** && packageJSON.name !== 'debe-delta' */
      ) {
        jobs.push({
          context: "{}",
          input: join(src, "index.test.ts"),
          output: {
            name: "debe",
            file: join(lib, "index.umd.test.js"),
            format: "umd",
            extend: true,
            globals: Object.keys(paths).reduce(
              (state, k) => {
                state[k] = "debe";
                return state;
              },
              {
                react: "React",
              }
            ),
          },
          external: [
            ...Object.keys(paths).filter((x) => integrate.indexOf(x) === -1),
            "react",
          ],
          plugins: [
            ts({
              tsconfig: "tsconfig.test.json",
            }),
            replace({
              values: {
                "process.env.NODE_ENV": JSON.stringify("production"),
              },
              preventAssignment: true,
            }),
            buildIns(),
            alias(
              integrate.reduce(
                (state, key) => ({
                  ...state,
                  [key]: join(
                    __dirname,
                    paths[key][0].replace("/src", "/lib"),
                    "index.js"
                  ),
                }),
                {}
              )
            ),
            json(),
            resolve({ browser: true }),
            commonjs({
              include: [/node_modules/],
            }),
            wasm(),
          ],
        });
      }
    }

    if (fs.existsSync(join(src, "index.test.tsx"))) {
      jobs.push({
        context: "{}",
        input: join(src, "index.test.tsx"),
        external: [...Object.keys(paths), "react", "idb/with-async-ittr-cjs"],
        output: [
          { file: join(lib, "index.cjs.test.jsx"), format: "cjs" },
          { file: join(lib, "index.es.test.mjsx"), format: "es" },
        ],
        plugins: [
          ts({
            tsconfig: {
              fileName: "tsconfig.test.json",
              hook: (resolvedConfig) => ({
                ...resolvedConfig,
                lib: ["lib.esnext", "lib.dom.d.ts"],
              }),
            },
          }),
          {
            banner() {
                return `/**
                * @jest-environment jsdom
                */`;
            }
          },
          resolve(),
          commonjs(),
          autoExternal({
            packagePath: join(lib, "package.json"),
          }),
          json(),
          wasm(),
        ],
      });
      if ( false &&
        packageJSON.browser !== false
        /** && packageJSON.name !== 'debe-delta' */
      ) {
        jobs.push({
          context: "{}",
          input: join(src, "index.test.tsx"),
          output: {
            name: "debe",
            file: join(lib, "index.umd.test.jsx"),
            format: "umd",
            extend: true,
            globals: Object.keys(paths).reduce(
              (state, k) => {
                state[k] = "debe";
                return state;
              },
              {
                react: "React",
              }
            ),
          },
          external: [
            ...Object.keys(paths).filter((x) => integrate.indexOf(x) === -1),
            "react",
          ],
          plugins: [
            ts({
              tsconfig: {
                fileName: "tsconfig.test.json",
                hook: (resolvedConfig) => ({
                  ...resolvedConfig,
                  lib: ["lib.esnext", "lib.dom.d.ts"],
                }),
              },
            }),
            replace({
              values: {
                "process.env.NODE_ENV": JSON.stringify("production"),
              },
              preventAssignment: true,
            }),
            buildIns(),
            alias(
              integrate.reduce(
                (state, key) => ({
                  ...state,
                  [key]: join(
                    __dirname,
                    paths[key][0].replace("/src", "/lib"),
                    "index.js"
                  ),
                }),
                {}
              )
            ),
            json(),
            resolve({ browser: true }),
            commonjs({
              include: [/node_modules/],
            }),
            wasm(),
          ],
        });
      }
    }
    return key;
  })
);

console.log(jobs);
export default jobs;
