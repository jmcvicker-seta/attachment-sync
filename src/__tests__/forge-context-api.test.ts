import { describe, it, expect } from '@jest/globals';
import { createBackendContext } from '@forge/testing-framework';

// Basic API contract tests for forge-context mock contexts

describe('forge-context API', () => {
  it('creates a backend context for issueActivity with overrides', () => {
    const ctx = createBackendContext('jira:issueActivity', {
      extension: { issue: { key: 'TEST-1' } },
    });
    expect(ctx.extension.issue.key).toBe('TEST-1');
    expect(ctx.extension.type).toBe('jira:issueActivity');
  });

  it('creates default context without overrides', () => {
    const ctx = createBackendContext('jira:issueActivity');
    expect(ctx.extension.type).toBe('jira:issueActivity');
    expect(ctx.extension.issue).toBeDefined();
    expect(ctx.extension.project).toBeDefined();
  });

  it('supports deep overrides', () => {
    const ctx = createBackendContext('jira:issueActivity', {
      extension: { project: { key: 'DEMO' } },
    });
    expect(ctx.extension.project.key).toBe('DEMO');
    // Should preserve other project fields
    expect(ctx.extension.project.id).toBeDefined();
    expect(ctx.extension.project.type).toBeDefined();
  });
});
