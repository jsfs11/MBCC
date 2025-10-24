const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    ignores: [
      "dist/",
      "build/",
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
      ".expo/",
      "web-build/",
      "eslint.config.js",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // React Native globals
        __DEV__: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      react: react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["jest.setup.js"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        it: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
];
