const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'no-var': 'error',
      'prefer-const': 'error',
      semi: ['error', 'never'],
      quotes: ['error', 'single', { avoidEscape: true }]
    }
  }
]
