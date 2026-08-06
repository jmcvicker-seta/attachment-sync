# Forge App Development Guide

This is an Atlassian Forge app built with TypeScript and Forge React (Forge UI Kit). It runs on the Forge platform.

## Project Structure

```
.testing-framework/.      # Provides drop-in shims, realistic API fixtures etc for Forge.
src/
├── index.ts              # Main entry point — exports resolver handler
├── resolvers/            # Backend resolver functions (Node.js runtime)
│   ├── index.ts          # Resolver implementation
│   └── __tests__/        # Resolver unit tests
├── frontend/             # React frontend (UI Kit 2)
│   ├── index.tsx         # App UI components
│   └── __tests__/        # Component tests
├── types/                # TypeScript type definitions
│   ├── index.ts          # Type exports
│   └── forge-ui-types.ts # Forge UI Kit component types (auto-generated)
├── __tests__/            # Integration and framework tests
└── setupTests.ts         # Jest test configuration

manifest.yml              # Forge app manifest — defines modules, permissions, resources
eslint.config.js          # ESLint with Forge-specific rules
jest.config.cjs           # Jest config with Forge shims
tsconfig.json             # TypeScript configuration
```

## Key Commands

```bash
npm run build             # TypeScript type-check (no emit — Forge compiles at deploy time)
npm run test              # Run all tests with Jest
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Tests with coverage report
npm run lint              # ESLint with Forge-specific rules
npm run lint:fix          # Auto-fix lint issues
npm run validate:manifest # Validate manifest.yml structure and rules
npm run security          # OWASP Top 10 SAST scan (blocking — fails on ERROR findings)
npm run security:advisory # OWASP Top 10 SAST scan (advisory — prints all findings, never fails)
npm run ci                # Full validation: manifest + type-check + tests + lint + security
```

Important: You should run `npm run ci` regularly to validate your work as you go

## Forge Platform Concepts

- **Modules** define where the app appears (e.g., `jira:issuePanel`, `confluence:contentAction`). Configured in `manifest.yml`.
- **`app.id`** in `manifest.yml` is the unique identifier assigned by `forge register`. It must
  be a valid ARI: `ari:cloud:ecosystem::app/<uuid>`. If blank or missing, run
  `forge-cli register [app-name]` — **never invent or guess an `app.id`**. After running
  register, verify `manifest.yml` has a non-blank `app.id` before completing your work.
  A blank or invalid `app.id` will cause the publish flow to fail when the user tries to
  publish the app. If `app.id` is still blank after running register, run it again.
- **Resolvers** are backend functions invoked from the frontend via `@forge/bridge`. They run in Node.js and can call Atlassian APIs via `@forge/api`.
- **Resources** point to frontend entry files that render UI Kit 2 components.
- **UI Kit 2** uses React with Forge-specific components from `@forge/react` (e.g., `Text`, `Button`, `Table`).

### Modals — always make them dismissable

A `Modal` MUST always be closeable. Never render an always-open modal. Gate it
behind open-state and close it from `onClose` (the `forge/modal-requires-on-close`
lint rule enforces this):

```tsx
const [isOpen, setIsOpen] = useState(false);
return (
  <>
    <Button onClick={() => setIsOpen(true)}>Open</Button>
    <ModalTransition>
      {isOpen && (
        <Modal onClose={() => setIsOpen(false)}>
          <ModalBody>…</ModalBody>
        </Modal>
      )}
    </ModalTransition>
  </>
);
```

Do **not** render `<ModalTransition><Modal>…</Modal></ModalTransition>` unconditionally
or without `onClose` — it traps the surface and cannot be closed. For
`confluence:contentAction` / `*:contextMenu` modules the host already provides the
modal surface, so render your content directly rather than wrapping it in your own
`Modal`.

### App Builder Preview Mode

App Builder preview is a UI-only iframe used while the app is being built. It is
not the same environment as the deployed Forge app running in Jira or Confluence.

Do **not** detect preview mode from `view.getContext().cloudId`. The
`cloudId: 'preview-mode'` value is temporarily preserved by App Builder preview
and the local testing framework for backward compatibility with older generated
apps. It is not the forward runtime contract. Do not use
`context.cloudId === 'preview-mode'` or missing `cloudId` in new runtime preview
detection.

If frontend runtime code needs preview-only mock data, check the preview runtime
signal inside the async load/effect path, not at module scope:

```typescript
const isAppBuilderPreview =
  typeof window !== 'undefined' &&
  (window as { __FORGE_PREVIEW__?: boolean }).__FORGE_PREVIEW__ === true;
```

Frontend tests that need to exercise this branch should opt in explicitly with
`bridge.setPreviewMode(true)`. Live-mode tests should leave preview mode unset
and use realistic context via `bridge.setContext(...)` or
`createFrontendContext(...)`.

## Testing

### Test Runner

Tests use **Jest** with `ts-jest` and `jsdom` environment. The testing framework provides drop-in shims for Forge platform modules so tests run locally without deploying.

### Module Shims (jest.config.cjs)

The Jest config maps `@forge/*` imports to local shims:

| Import | Shim | Purpose |
|--------|------|---------
| `@forge/api` | `.testing-framework/dist/shims/forge-api/` | Fake `fetch`, `route()`, `asApp()`, `asUser()` |
| `@forge/bridge` | `.testing-framework/dist/shims/forge-bridge/` | Fake `invoke()`, `view` |
| `@forge/kvs` | `.testing-framework/dist/shims/forge-kvs/` | In-memory key-value store with Custom Entity support |
| `@forge/react` | `.testing-framework/dist/shims/forge-react/` | Stub UI Kit components, `ForgeReconciler`, `xcss()` |

These shims are automatically active in tests — no manual setup needed.

### Testing Framework (`@forge/testing-framework`)

Import from `@forge/testing-framework` for test utilities:

```typescript
import {
  createFrontendContext,      // Frontend context (useProductContext)
  createBackendContext,       // Backend resolver context
  FixtureStore,               // API response fixture management
} from '@forge/testing-framework';
```

#### Mock Contexts

Generate realistic Forge contexts for any module type:

```typescript
// Frontend context — what useProductContext() returns
const ctx = createFrontendContext('jira:issuePanel', {
  extension: { issue: { key: 'BUG-42', type: 'Bug' } },
});
// ctx.extension.type === 'jira:issuePanel'
// ctx.extension.issue.key === 'BUG-42'

// Backend resolver context — what the resolver receives
const resolverCtx = createBackendContext('jira:issuePanel');
// resolverCtx.accountId, resolverCtx.installContext, etc.
```

#### Fixture Store

Manage API response fixtures with cascading priority:

```typescript
import { FixtureStore } from '@forge/testing-framework';

const store = new FixtureStore({
  fixtureDir: './fixtures',  // Optional: load fixtures from files
});

// Built-in defaults cover common Jira and Confluence APIs (GET, POST, PUT, DELETE)
const result = store.lookup('GET', '/rest/api/3/issue/TEST-1');
// result.found === true, result.response.body contains realistic issue data

// Override for specific tests via the test harness
harness.addFixture('GET', '/rest/api/3/issue/TEST-1', {
  status: 200,
  body: { key: 'TEST-1', fields: { summary: 'Custom fixture' } },
});
```

### Writing Tests

**Resolver tests** — use the test harness to invoke resolvers with realistic context and API fixtures:

```typescript
import { createTestHarness } from '@forge/testing-framework';
import { handler } from '../resolvers/index';

const harness = createTestHarness({ manifest: './manifest.yml', handler });

beforeEach(() => {
  harness.reset(); // Clears storage, API call history, and fixture overrides
});

describe('my resolver', () => {
  it('returns data using default API fixtures', async () => {
    // Default fixtures for common Jira/Confluence APIs are provided automatically.
    // The harness auto-detects the module type from the manifest and populates
    // the context extension with realistic defaults.
    const result = await harness.invoke('getIssueData');
    expect(result.data).toBeDefined();
  });

  it('works with custom fixtures and payload', async () => {
    harness.addFixture('GET', '/rest/api/3/issue/BUG-1', {
      status: 200,
      body: { key: 'BUG-1', fields: { summary: 'Fix login' } },
    });

    const result = await harness.invoke('getIssueData', {
      payload: { issueKey: 'BUG-1' },
    });
    expect(result.data).toEqual({ summary: 'Fix login' });
  });

  it('can inspect API calls made by the resolver', async () => {
    await harness.invoke('getIssueData');
    expect(harness.apiCalls.some(c => c.path.includes('/issue/'))).toBe(true);
  });
});
```

**Frontend tests** — the `@forge/react` shim provides stub components automatically. Use the bridge shim to set up context and mock `invoke()` responses:

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { bridge } from '@forge/bridge';
import { createFrontendContext } from '@forge/testing-framework';
import App from '../frontend/index';

beforeEach(() => {
  bridge.reset(); // Clears context, invoke handlers, and recorded interactions
});

describe('App', () => {
  it('should render with product context', async () => {
    // Set context — this populates view.getContext(), useProductContext(), AND useConfig()
    // For macros, put config values in extension.config (mirrors the real Forge runtime)
    bridge.setContext(createFrontendContext('jira:issuePanel', {
      extension: { issue: { key: 'TEST-1', type: 'Task' } },
    }));

    // Mock resolver responses for invoke() calls
    bridge.mockInvoke('getData', { items: [{ id: 1, title: 'Example' }] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeDefined();
    });

    // Assert invoke was called with expected args
    expect(bridge.invocations).toHaveLength(1);
    expect(bridge.invocations[0].functionKey).toBe('getData');
  });

  it('should disable submit button when form is invalid', async () => {
    bridge.setContext(createFrontendContext('jira:issuePanel'));

    render(<App />);

    // Forge UI Kit behavioral props (isDisabled, isLoading, appearance, etc.)
    // are forwarded as data-* attributes on the shim's rendered div.
    const submitButton = screen.getByTestId('forge-button');
    expect(submitButton).toHaveAttribute('data-isdisabled', 'true');
  });
});
```

> **NEVER use `jest.mock()` for `@forge/*` modules** (e.g., `@forge/bridge`, `@forge/react`, `@forge/api`). These are already shimmed via `moduleNameMapper` in `jest.config.cjs`. Manually mocking them will override the shims and break tests. If a shim is genuinely missing from the test framework, then creating a mock is ok.

## Forge UI Kit Types

TypeScript definitions for Forge UI Kit components are in `src/types/forge-ui-types.ts`. These provide type safety for component props:

```typescript
import { ButtonProps, BoxProps } from '../types';
import { xcss } from '@forge/react'; // runtime helper — import directly, NOT from '../types'

// Type-safe xcss styling
const styles = xcss({
  padding: 'space.200',
  backgroundColor: 'color.background.neutral',
});
```

These types are auto-generated. Do not edit `forge-ui-types.ts` manually.

`'../types'` is a side-effect-free type barrel. Always import runtime helpers like `xcss` (and components like `Box`, `Button`, `ForgeReconciler`) directly from `@forge/react`. Importing runtime values from `'../types'` would cause backend resolvers that touch the types barrel to crash at module load with `ReferenceError: window is not defined`.

## Storage Constraints

The Forge KVS has runtime limits that the testing framework enforces locally:

- **Per-key value size**: 245,760 characters (~240 KB) after JSON serialisation. Writes larger than this are rejected with HTTP 413 — both in real Forge and in FakeKvs.
- For collections that may grow (lists of users, candidates, jobs, results), use a **chunk pattern**:
  - `<prefix>:meta` → `{ count, chunkSize, lastChunk }`
  - `<prefix>:chunk:<n>` → `[…up to ~50 items per chunk]` (≈ 5 KB each)
- Other limits to be aware of: total app KVS quota, entity index key length, batch operation size.

If you need to bypass the size limit in tests (e.g. to test large-value handling intentionally), create the `FakeKvs` with `{ disableSizeLimit: true }`.

## Important Notes

- **Do not import Node.js built-ins in frontend code** — frontend runs in a sandboxed browser environment
- **Use `@forge/api` for HTTP requests in resolvers** — direct `fetch` won't have the right auth context
- **`@forge/react` components only** in frontend — standard HTML elements are not supported in UI Kit 2
- **Manifest changes require redeployment** — `forge deploy` after modifying `manifest.yml`
- **The `app.id` field** in `manifest.yml` must be set via `forge register` before first deploy

## Secure Forge Defaults

- **Web triggers are public by default** — every `modules.webtrigger` handler must
  validate an incoming secret or `Authorization` header before doing work and return
  `401` or `403` when validation fails.
- **Do not collect secrets in Confluence macro config** — macro config does not
  reliably support masked password input. If users need to enter an API token,
  password, private key, or other credential, collect it in the rendered macro UI
  or another authenticated UI module using a password `Textfield`.
- **Store user-entered secrets with the Forge KVS secret APIs** — use
  `kvs.setSecret` / `kvs.getSecret` / `kvs.deleteSecret`, not regular `kvs.set`
  or `storage.set`, for API tokens, passwords, private keys, client secrets, and
  credentials. Keep only non-sensitive metadata in regular KVS.
- **Never log secrets** — do not include tokens, passwords, authorization headers,
  private keys, or full credential-bearing payloads in `console.log`/`console.error`.
- **Use least privilege** — add only the scopes, egress entries, and storage access
  needed by the implemented code.

## Development Rules

### ⛔ NEVER DO

- **NEVER use `forge create`** — the app already exists
- **NEVER create new apps from scratch** — only modify the existing app
- **NEVER delete the existing app** — modify and extend the provided project
- **NEVER skip linting** — fix ALL errors before completing
- **NEVER deploy or install the app** — the user will publish through the UI
- **NEVER set `app.id` to a placeholder, fake, or made-up value** — a valid `app.id`
  is only assigned by `forge register` and looks like `ari:cloud:ecosystem::app/<uuid>`.
  Setting it to anything else (e.g. `ari:cloud:ecosystem::app/00000000-0000-0000-0000-000000000000`,
  blank, or null) will cause the publish flow to fail when the user tries to publish.
  If `app.id` is missing or blank, run `forge-cli register [app-name]` to get a real ID —
  never invent one.
- **NEVER ask users to run commands** — execute all commands yourself using tools
- **NEVER ask users for manual intervention** — complete all tasks autonomously
- **NEVER leave incomplete code** — never leave TODOs or unfinished code
- **NEVER leave `it.todo` test placeholders unchanged** — replace with real tests
  or delete the file if that test type doesn't apply
- **NEVER create test files alongside existing test stubs** — update the existing
  file, don't create parallel files
- **NEVER write tests that only test mocks** — test real code with real functions
- **NEVER write `expect(true).toBe(true)` or no-op assertions** — every test must
  exercise real app code
- **NEVER manually mock `@forge/*` modules** (`@forge/react`, `@forge/bridge`,
  `@forge/api`, `@forge/kvs`) — these are shimmed via `jest.config.cjs`
- **NEVER ignore code coverage** — meet the thresholds configured in jest.config.cjs
- **NEVER use deprecated Atlassian REST APIs** — your training data may be outdated; before adding or changing any Atlassian REST endpoint, call `search-forge-docs` (or `query-forge-knowledge-fragments`) for the exact path + method and confirm the OpenAPI response does NOT contain `"deprecated": true` for the route you want. Always migrate to the documented replacement as 'deprecated' almost always means 'removed'.
- **NEVER fall back to mock data on error** — in live mode, display errors to the user

### ✅ ALWAYS DO

- **Work within the project root only**
- **Use the `forge-cli` tool for ALL Forge commands** — never use bash to run forge
  commands. The forge-cli tool handles credentials automatically
- **Run `forge-cli register [app-name]` if `app.id` is blank or missing in `manifest.yml`**
  before deploying. After register completes, check `manifest.yml` to confirm `app.id`
  is now a valid ARI (`ari:cloud:ecosystem::app/<uuid>`). If it is still blank, run
  `forge-cli register` again — do not proceed to deploy with a blank `app.id`.
- **Read existing code** before making changes
- **Run `npm run ci` regularly** — this runs type-check, lint, manifest validation,
  tests with coverage enforcement, and the OWASP Top 10 security scan
- **Implement Preview Mode** — users must see mock data in preview, not loading/error
  states. Live mode must use real data
- **Follow tech spec modules** — don't swap modules during development
- **Use correct manifest module keys** — Confluence macros use the top-level key `macro`,
  NOT `confluence:macro`. Other Confluence modules use prefixed keys like `confluence:fullPage`,
  `confluence:contentBylineItem`. Jira modules use `jira:issuePanel`, `jira:issueAction`, etc.
- **Keep all manifest keys ≤ 23 characters** — Forge enforces a 23-character max on all
  `key` values (modules, functions, resources, remotes). Use only `[a-zA-Z0-9_-]`,
  lowercase-with-hyphens convention, and short suffixes like `-fn`, `-res`, `-hdlr`.
  Keys must be unique within the manifest.
- **Write useful tests** — use the testing framework in `.testing-framework/`.
  Spend time understanding it. Use createTestHarness for resolver tests
- **Test cold-start and edge cases** — test with empty storage and edge-case inputs
- **Implement proper error handling** — log with console.error() in resolvers.
  Return errors to frontend for display. Add generous console logs for debugging
- **Verify scopes match API usage** — before completing, review every API call
  and confirm correct scope + allowImpersonation settings in manifest
- **Take screenshots of ALL UI modules** after development — verify they render
  correctly with mock data

## Quality Gates — MUST ALL PASS before completing

Run these checks in order after development or any changes:

1. **`npm run ci`** — manifest validation, Forge lint, type-checking, tests with
   coverage, ESLint, and the OWASP Top 10 security scan. Fix ALL errors, re-run until clean.
2. **Security (OWASP Top 10)** — `npm run ci` runs the blocking scan (`npm run security`)
   for you; it fails on any **ERROR**-severity finding (injection, SSRF, hardcoded
   secrets, path traversal, open redirect, disabled TLS, eval, JWT `none`). Fix every
   ERROR finding at its source (validate/allow-list user input, parameterise queries,
   move secrets to Forge env vars / storage) and re-run until clean — never suppress.
   Then run **`npm run security:advisory`** and address the non-blocking **WARNING**
   findings (weak hashing, insecure randomness, wildcard CORS, dynamic require) where
   reasonable.
3. **`forge build`** (via forge-cli tool) — verify webpack bundling succeeds.
   Note: webpack does NOT support TypeScript path aliases (e.g. `@/...`).
4. **Take screenshots** (via `take-screenshot` tool) — capture ALL UI modules.
   Verify layout, styling, Atlassian Design System compliance, no errors,
   mock data visible in preview mode.
5. **Review screenshots** — if any show errors, blank screens, or missing content,
   fix and re-screenshot.

## API Authentication

Forge apps use `@forge/api` to call Atlassian REST APIs. Choose the right identity:

### `asApp()` — App identity
Use when the action doesn't need to appear as a specific user:
- Reading public data, background tasks, scheduled jobs, webhooks, admin operations

```typescript
import api, { route } from '@forge/api';
const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`);
```

### `asUser()` — User identity (inline impersonation)
Use when the action should appear as the current user (available in UI Kit modules):
- Creating/updating content, commenting, assigning issues, any user-facing write
- The user gets an OAuth consent prompt automatically — no special manifest config needed

```typescript
const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKey}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData),
});
```

**Manifest — simple scopes are sufficient for `asUser()`:**
```yaml
permissions:
  scopes:
    - write:jira-work
```

**Note:** `allowImpersonation: true` is only required for offline impersonation
(`api.asUser(accountId)`) — e.g., acting as a specific user from a scheduled trigger.
It is NOT needed for the standard `api.asUser()` call in UI Kit modules.

**Decision rules:**
- If the user is present and should see themselves as the author → `asUser()`
- If it's a system/background action or the user is not present → `asApp()`
- When in doubt in a UI module → `asUser()` (respects user permissions)

## Resolver Context Shapes

Each resolver receives `(req)` where `req.payload` is frontend data and
`req.context` is product context:

- **Confluence macro**: `req.context.extension.content.id`, `req.context.extension.space.key`
- **Jira issue panel**: `req.context.extension.issue.key`, `req.context.extension.issue.id`
- **Jira project page**: `req.context.extension.project.key`
- **Jira dashboard gadget**: `req.context.extension.dashboard.id`
- **Global page**: No specific extension context (just `req.context.accountId`)

## xcss Token Reference

When using `xcss()` for styling Forge UI Kit `Box` components, use these design tokens:

### Spacing tokens (for padding, margin, gap, etc.)
`space.0`, `space.025`, `space.050`, `space.075`, `space.100`, `space.150`,
`space.200`, `space.250`, `space.300`, `space.400`, `space.500`, `space.600`,
`space.800`, `space.1000`

### Color tokens
- **Background**: `color.background.neutral`, `color.background.neutral.subtle`,
  `color.background.brand.bold`, `color.background.success`, `color.background.danger`,
  `color.background.warning`, `color.background.information`, `color.background.input`
- **Text**: `color.text`, `color.text.subtle`, `color.text.subtlest`,
  `color.text.brand`, `color.text.success`, `color.text.danger`,
  `color.text.warning`, `color.text.information`, `color.text.inverse`
- **Border**: `color.border`, `color.border.bold`, `color.border.brand`,
  `color.border.success`, `color.border.danger`

### Border tokens
- **Width**: `border.width`, `border.width.outline`
- **Radius**: `radius.xsmall`, `radius.small`, `radius.medium`, `radius.large`,
  `radius.xlarge`, `radius.xxlarge`, `radius.full`, `radius.tile`
- **Style**: Use string values like `'solid'`, `'none'`

### Example
```typescript
const containerStyles = xcss({
  padding: 'space.200',
  backgroundColor: 'color.background.neutral',
  borderRadius: 'radius.small',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
});
```
