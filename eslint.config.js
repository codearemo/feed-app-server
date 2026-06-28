const js = require('@eslint/js');
const pluginN = require('eslint-plugin-n');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/**', 'eslint.config.js', 'vitest.config.js'],
  },
  js.configs.recommended,
  pluginN.configs['flat/recommended-script'],
  {
    files: ['src/**/*.js'],
    rules: {
      eqeqeq: 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-throw-literal': 'error',
    },
  },
  {
    files: ['src/server.js', 'src/database/**/*.js', 'src/utils/mail.js', 'src/modules/auth/services/auth.service.js'],
    rules: {
      'no-console': 'off',
      'n/no-process-exit': 'off',
    },
  },
  {
    // Build scripts — devDependencies are expected here
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
      'n/no-process-exit': 'off',
      'n/no-unpublished-require': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        beforeAll: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'n/no-unpublished-require': 'off',
    },
  },
  prettierConfig,
];
