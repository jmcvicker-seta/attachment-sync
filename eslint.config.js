// eslint.config.js format (ESLint 9+ flat config, also supported in ESLint 8 with ESLINT_USE_FLAT_CONFIG=true)
//
// A Forge app has two distinct runtimes plus a test environment, and each needs
// a different set of globals and rules. Globals are scoped per file pattern so a
// runtime never sees globals it cannot actually use:
//   - Backend resolvers run on Node (the manifest pins nodejs22.x). They contain
//     no JSX/React, so only Node built-ins are in scope and the React plugins are
//     not loaded for them at all.
//   - Frontend (Forge UI Kit) is bundled and runs in a browser iframe sandbox, so
//     it gets browser globals. UI Kit is React-like but renders via Forge's own
//     reconciler, which drives the react-hooks rule choice below.
//   - Tests run under Jest with jsdom, so they get Node + Jest + DOM globals.
//
// Globals come from the `globals` npm package so new globals from Node upgrades
// are picked up automatically, rather than maintaining a hand-rolled list.
import js from '@eslint/js';
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Load vendored Forge ESLint plugin
let forgePlugin;
try {
  forgePlugin = (await import('./.eslint/forge-plugin/dist/index.js')).default;
} catch {
  console.warn('Forge ESLint plugin not found - run yarn sync:eslint-plugin');
}

// react-hooks: allowlist the rules that catch genuine bugs under any reconciler.
// We deliberately do NOT spread `reactHooks.configs.recommended.rules`: since v7,
// recommended also enables React Compiler rules and render-purity rules. Forge UI
// Kit renders via Forge's own reconciler (no React Compiler, no DOM access), so
// those extra rules false-positive on legitimate Forge patterns — for example,
// calling setState inside a useEffect after an async invoke()/requestJira() fetch.
// Do NOT re-add the spread unless this template adopts the React Compiler.
const reactHooksRules = {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'react-hooks/set-state-in-render': 'error',
};

// Shared plugin/settings for the two zones that actually contain JSX (frontend
// and tests). The backend deliberately omits these — resolvers have no JSX.
const reactPlugins = {
  '@typescript-eslint': tsEslint,
  react: react,
  'react-hooks': reactHooks,
  ...(forgePlugin ? { forge: forgePlugin } : {}),
};
const reactSettings = { react: { version: 'detect' } };

// Newer `globals` versions list browser Web Storage under `nodeBuiltin`
// (Node exposes it experimentally), but Forge resolvers must not use it. We
// omit these keys entirely — rather than setting them to 'off', which leaves
// the name in scope — so resolver code referencing them fails `no-undef`,
// regardless of which `globals` version is installed.
const omitGlobals = (source, namesToOmit) =>
  Object.fromEntries(Object.entries(source).filter(([name]) => !namesToOmit.has(name)));

const nodeResolverGlobals = omitGlobals(
  globals.nodeBuiltin,
  new Set(['localStorage', 'sessionStorage']),
);

// Rules common to the JSX zones: js + ts + react recommended, the react-hooks
// allowlist, and the usual JSX-transform / unused-vars overrides.
const reactRules = {
  ...js.configs.recommended.rules,
  ...tsEslint.configs.recommended.rules,
  ...react.configs.recommended.rules,
  ...reactHooksRules,
  'react/react-in-jsx-scope': 'off', // Not needed with the React 17+ JSX transform
  'no-unused-vars': 'off', // Turn off base rule in favour of the TS-aware one
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  ...(forgePlugin ? forgePlugin.configs.recommended.rules : {}),
};

export default [
  js.configs.recommended,

  // ── Backend / resolvers ──────────────────────────────────────────────
  // Forge resolvers run on Node (manifest runtime nodejs22.x). They have full
  // Node built-ins (which include web-platform APIs Node provides natively, such
  // as fetch, crypto, URL, TextEncoder) but NOT browser-only globals like window,
  // document, or localStorage. Resolvers contain no JSX or React hooks, so the
  // React/react-hooks plugins are intentionally not loaded here.
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/frontend/**', 'src/components/**', '**/*.{test,spec}.*', '**/__tests__/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...nodeResolverGlobals, // Node built-ins minus browser Web Storage
        JSX: 'readonly', // JSX namespace for TypeScript type positions
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      ...(forgePlugin ? { forge: forgePlugin } : {}),
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsEslint.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      ...(forgePlugin ? forgePlugin.configs.recommended.rules : {}),
    },
  },

  // ── Frontend (UI Kit) ────────────────────────────────────────────────
  // UI Kit code is bundled and runs in a browser iframe sandbox, so browser
  // globals are valid here. It is React-like but renders via Forge's own
  // reconciler, so the react-hooks allowlist (see reactHooksRules) applies.
  {
    files: ['src/frontend/**/*.{js,jsx,ts,tsx}', 'src/components/**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/*.{test,spec}.*', '**/__tests__/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        JSX: 'readonly',
      },
    },
    plugins: reactPlugins,
    settings: reactSettings,
    rules: reactRules,
  },

  // ── Test files ───────────────────────────────────────────────────────
  // Tests run under Jest with jsdom, so they need Node + Jest globals plus DOM
  // globals. jsdom is not the React Compiler either, so the same react-hooks
  // allowlist applies here.
  {
    files: [
      '**/*.{test,spec}.{ts,tsx,js,jsx}',
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
      'src/setupTests.ts',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
        JSX: 'readonly',
      },
    },
    plugins: reactPlugins,
    settings: reactSettings,
    rules: reactRules,
  },
];
