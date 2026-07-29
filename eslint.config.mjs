import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'logs/**',
      'tmp/**',
      'uploads/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      'import/no-unresolved': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    },
    settings: {
      'import/resolver': {
        node: true
      }
    }
  },
  prettierConfig
];
