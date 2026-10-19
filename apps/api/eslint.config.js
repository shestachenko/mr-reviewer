// @ts-check
import {createRequire} from 'node:module';

import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const {plugins, rules, linterOptions} = require('../../eslint.shared.cjs');

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylistic,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins,
    linterOptions,
    rules: {
      ...rules,
      'no-console': 'error',
    },
  },
]);
