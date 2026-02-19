import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

/** Raw Tailwind palette colors that should be replaced with semantic design tokens */
const RAW_PALETTE_REGEX =
  '(text|bg|border|ring|shadow|outline|divide)-(gray|slate|red|green|blue|amber|teal|yellow|orange|purple|pink|indigo|violet|cyan|emerald|lime|rose|fuchsia|sky|stone|zinc|neutral)-\\d'

export default defineConfig([
  globalIgnores(['dist', 'backend']),

  // Base config for all TS/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Ban console.log (allow warn/error)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Ban export default -- enforce named exports
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports instead of export default.',
        },
      ],
    },
  },

  // Ban raw Tailwind palette colors in component files
  {
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['src/components/dev/**'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports instead of export default.',
        },
        {
          selector: `Literal[value=/${RAW_PALETTE_REGEX}/]`,
          message:
            'Use semantic design tokens from index.css instead of raw Tailwind palette colors. E.g. text-base-foreground-default instead of text-gray-900.',
        },
        {
          selector: `TemplateLiteral > TemplateElement[value.raw=/${RAW_PALETTE_REGEX}/]`,
          message:
            'Use semantic design tokens from index.css instead of raw Tailwind palette colors. E.g. text-base-foreground-default instead of text-gray-900.',
        },
      ],
    },
  },

  // Ban direct react-aria-components imports outside ui/ directory
  {
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: 'react-aria-components',
              message:
                'Import from @/components/ui instead. Only src/components/ui/ files may import react-aria-components directly.',
            },
          ],
        },
      ],
    },
  },
])
