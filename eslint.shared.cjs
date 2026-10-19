const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');

// The source config also banned imports across core/features/integrations/clients/shared.
// This repo has no such layers and no path aliases, so those bans are not copied.

const plugins = {
  'simple-import-sort': simpleImportSort,
  'unused-imports': unusedImports,
};

const rules = {
  'no-undef': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      vars: 'all',
      args: 'after-used',
      caughtErrors: 'all',
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/ban-ts-comment': [
    'error',
    {
      'ts-expect-error': true,
      'ts-ignore': true,
      'ts-nocheck': true,
      'ts-check': false,
    },
  ],
  '@typescript-eslint/consistent-type-assertions': ['error', {assertionStyle: 'never'}],
  'simple-import-sort/exports': 'error',
  'simple-import-sort/imports': [
    'error',
    {
      groups: [
        ['^\\u0000'],
        [
          '^(node:|fs$|path$|url$|crypto$|stream$|timers$|util$|os$|http$|https$|zlib$|child_process$|worker_threads$|buffer$|process$)',
        ],
        ['^@?\\w'],
        ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
        ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
      ],
    },
  ],
  'object-curly-spacing': ['error', 'never'],
  'array-bracket-spacing': ['error', 'never'],
  quotes: ['error', 'single', {avoidEscape: true}],
  indent: ['error', 2, {SwitchCase: 1}],
  'padding-line-between-statements': [
    'error',
    {blankLine: 'always', prev: '*', next: 'return'},
    {blankLine: 'always', prev: '*', next: 'if'},
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector:
        'MemberExpression[object.name=/^(describe|it|test|suite|bench)$/][property.name=/^(only|skip|todo|failing)$/]',
      message: 'Focused or disabled test. Fix or delete it.',
    },
  ],
};

const linterOptions = {
  noInlineConfig: true,
  reportUnusedDisableDirectives: 'error',
};

module.exports = {plugins, rules, linterOptions};
