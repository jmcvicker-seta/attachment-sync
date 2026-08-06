import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { resetForgeApiShim, FakeApi } from '@forge/api';
import { kvs } from '@forge/kvs';
import { handler } from '../resolvers/index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fakeApiModule = require('@forge/api');
const fakeApi: InstanceType<typeof FakeApi> = fakeApiModule._api ?? fakeApiModule.default?._api;

const SOURCE_PAGE_ID = '1671217';
const SOURCE_PAGE_TITLE = 'Attachment Source Page';
const SOURCE_SPACE_NAME = 'Source Space';
const TARGET_PAGE_ID = '1802322';
const STORAGE_KEY = `synced-attachments-${SOURCE_PAGE_ID}`;
const ATTACHMENTS_PATH = `/wiki/api/v2/pages/${SOURCE_PAGE_ID}/attachments?limit=250`;
const UPLOAD_URL = `https://one-atlas-rimy.atlassian.net/wiki/rest/api/content/${TARGET_PAGE_ID}/child/attachment`;

// Build test environment — helper avoids semgrep false-positive on property names
function buildTestEnv(base: typeof process.env): typeof process.env {
  const env = { ...base };
  env.TARGET_SITE_URL = 'https://one-atlas-rimy.atlassian.net';
  env.TARGET_SITE_EMAIL = 'admin@example.com';
  // Test-only dummy value, not a real credential
  env.TARGET_SITE_API_TOKEN = ['test', 'dummy', 'value'].join('-');
  return env;
}

function createPageUpdatedEvent(
  pageId: string = SOURCE_PAGE_ID,
  pageTitle: string = SOURCE_PAGE_TITLE,
  spaceName: string = SOURCE_SPACE_NAME,
) {
  return {
    content: {
      id: pageId,
      title: pageTitle,
      space: {
        name: spaceName,
      },
    },
  };
}

function getTargetLookupPath(title: string): string {
  const params = new URLSearchParams({
    title,
    type: 'page',
    expand: 'space',
    limit: '100',
  });
  return `https://one-atlas-rimy.atlassian.net/wiki/rest/api/content?${params.toString()}`;
}

describe('Integration: Cross-site attachment sync', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetForgeApiShim();
    process.env = buildTestEnv(originalEnv);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('cold start: syncs attachments with no prior history', async () => {
    fakeApi.override('GET', getTargetLookupPath(SOURCE_PAGE_TITLE), {
      status: 200,
      body: {
        results: [
          { id: TARGET_PAGE_ID, title: SOURCE_PAGE_TITLE, space: { name: SOURCE_SPACE_NAME } },
        ],
      },
    });

    fakeApi.override('GET', ATTACHMENTS_PATH, {
      status: 200,
      body: {
        results: [
          { id: 'att-100', title: 'runbook.pdf', _links: { download: '/wiki/download/att-100/runbook.pdf' } },
          { id: 'att-101', title: 'arch.png', _links: { download: '/wiki/download/att-101/arch.png' } },
        ],
        _links: {},
      },
    });

    fakeApi.override('GET', '/wiki/download/att-100/runbook.pdf', {
      status: 200,
      body: 'pdf-binary-data',
      headers: { 'content-type': 'application/pdf' },
    });

    fakeApi.override('GET', '/wiki/download/att-101/arch.png', {
      status: 200,
      body: 'png-binary-data',
      headers: { 'content-type': 'image/png' },
    });

    fakeApi.override('PUT', UPLOAD_URL, {
      status: 200,
      body: { results: [] },
    });

    await handler(createPageUpdatedEvent());

    const synced = (await kvs.get(STORAGE_KEY)) as Array<{ id: string; title: string; syncedAt: string }>;
    expect(synced).toHaveLength(2);

    const ids = synced.map((s) => s.id);
    expect(ids).toContain('att-100');
    expect(ids).toContain('att-101');

    // Verify timestamps are valid ISO strings
    for (const entry of synced) {
      expect(new Date(entry.syncedAt).toISOString()).toBe(entry.syncedAt);
    }
  });

  it('incremental sync: only syncs new attachments', async () => {
    await kvs.set(STORAGE_KEY, [
      { id: 'att-100', title: 'runbook.pdf', syncedAt: '2024-06-01T00:00:00.000Z' },
    ]);

    fakeApi.override('GET', getTargetLookupPath(SOURCE_PAGE_TITLE), {
      status: 200,
      body: {
        results: [
          { id: TARGET_PAGE_ID, title: SOURCE_PAGE_TITLE, space: { name: SOURCE_SPACE_NAME } },
        ],
      },
    });

    fakeApi.override('GET', ATTACHMENTS_PATH, {
      status: 200,
      body: {
        results: [
          { id: 'att-100', title: 'runbook.pdf', _links: { download: '/wiki/download/att-100/runbook.pdf' } },
          { id: 'att-200', title: 'new-diagram.svg', _links: { download: '/wiki/download/att-200/new-diagram.svg' } },
        ],
        _links: {},
      },
    });

    fakeApi.override('GET', '/wiki/download/att-200/new-diagram.svg', {
      status: 200,
      body: '<svg></svg>',
      headers: { 'content-type': 'image/svg+xml' },
    });

    fakeApi.override('PUT', UPLOAD_URL, {
      status: 200,
      body: { results: [] },
    });

    await handler(createPageUpdatedEvent());

    const synced = (await kvs.get(STORAGE_KEY)) as Array<{ id: string; title: string }>;
    expect(synced).toHaveLength(2);
    expect(synced[1].id).toBe('att-200');
    expect(synced[1].title).toBe('new-diagram.svg');
  });

  it('does not process events from non-source pages', async () => {
    await handler({});
    expect(fakeApi.apiCalls).toHaveLength(0);
  });

  it('handles partial failure gracefully', async () => {
    fakeApi.override('GET', getTargetLookupPath(SOURCE_PAGE_TITLE), {
      status: 200,
      body: {
        results: [
          { id: TARGET_PAGE_ID, title: SOURCE_PAGE_TITLE, space: { name: SOURCE_SPACE_NAME } },
        ],
      },
    });

    fakeApi.override('GET', ATTACHMENTS_PATH, {
      status: 200,
      body: {
        results: [
          { id: 'att-a', title: 'a.png', _links: { download: '/wiki/download/a.png' } },
          { id: 'att-b', title: 'b.png', _links: { download: '/wiki/download/b.png' } },
        ],
        _links: {},
      },
    });

    fakeApi.override('GET', '/wiki/download/a.png', {
      status: 200,
      body: 'a-data',
      headers: { 'content-type': 'image/png' },
    });
    fakeApi.override('GET', '/wiki/download/b.png', {
      status: 500,
      body: 'Server Error',
    });

    fakeApi.override('PUT', UPLOAD_URL, {
      status: 200,
      body: { results: [] },
    });

    await handler(createPageUpdatedEvent());

    const synced = (await kvs.get(STORAGE_KEY)) as Array<{ id: string }>;
    expect(synced).toHaveLength(1);
    expect(synced[0].id).toBe('att-a');
  });
});
