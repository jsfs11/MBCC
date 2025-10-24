import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import js from "@eslint/js";

export default [
  {
    ignores: [
      "dist/",
      "**/*.js.map",
      "node_modules/",
      "coverage/",
      "**/*.log",
      "pids",
      "**/*.pid",
      "**/*.seed",
      "**/*.pid.lock",
      ".tmp/",
      ".temp/",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        // Node.js globals
        __dirname: "readonly",
        __filename: "readonly",
        exports: "writable",
        module: "readonly",
        require: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        global: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "warn",
    },
  },
  {
    files: ["**/__tests__/**/*", "**/*.test.ts", "**/*.test.js", "jest.setup.js"],
    languageOptions: {
      globals: {
        // Jest globals
        jest: "readonly",
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
];
