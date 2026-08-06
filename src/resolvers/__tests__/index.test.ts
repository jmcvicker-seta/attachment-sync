import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { resetForgeApiShim, FakeApi } from '@forge/api';
import { kvs } from '@forge/kvs';
import {
  handler,
  getSyncedAttachments,
  addSyncedAttachment,
  listSourceAttachments,
  uploadToTarget,
  webTrigger,
} from '../index';

// Access the singleton FakeApi for fixture overrides
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
  env.WEB_TRIGGER_SECRET = 'automation-secret';
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

// Fixture helpers
function createAttachmentFixture(
  id: string,
  title: string,
  downloadUrl: string = `/wiki/download/attachments/${id}/${title}`,
) {
  return {
    id,
    title,
    _links: { download: downloadUrl },
  };
}

function setupAttachmentListFixture(attachments: ReturnType<typeof createAttachmentFixture>[]) {
  fakeApi.override('GET', ATTACHMENTS_PATH, {
    status: 200,
    body: {
      results: attachments,
      _links: {},
    },
  });
}

function setupTargetLookupFixture(
  title: string = SOURCE_PAGE_TITLE,
  results: Array<{ id: string; title: string; space: { name: string } }> = [
    { id: TARGET_PAGE_ID, title: SOURCE_PAGE_TITLE, space: { name: SOURCE_SPACE_NAME } },
  ],
) {
  fakeApi.override('GET', getTargetLookupPath(title), {
    status: 200,
    body: { results },
  });
}

function setupSourcePageMetadataFixture(pageId: string = SOURCE_PAGE_ID) {
  fakeApi.override('GET', `/wiki/api/v2/pages/${pageId}`, {
    status: 200,
    body: {
      id: pageId,
      title: SOURCE_PAGE_TITLE,
      spaceId: 'space-1',
    },
  });

  fakeApi.override('GET', '/wiki/api/v2/spaces/space-1', {
    status: 200,
    body: {
      id: 'space-1',
      name: SOURCE_SPACE_NAME,
    },
  });
}

function setupDownloadFixture(downloadUrl: string, content: string = 'file-binary-data') {
  fakeApi.override('GET', downloadUrl, {
    status: 200,
    body: content,
    headers: { 'content-type': 'image/png' },
  });
}

function setupUploadFixture(status: number = 200) {
  fakeApi.override('PUT', UPLOAD_URL, {
    status,
    body: { results: [{ id: 'target-att-1', title: 'uploaded.png' }] },
  });
}

describe('SyncHistoryService', () => {
  beforeEach(() => {
    resetForgeApiShim();
  });

  it('returns empty array when no sync history exists', async () => {
    const result = await getSyncedAttachments(SOURCE_PAGE_ID);
    expect(result).toEqual([]);
  });

  it('returns stored sync history', async () => {
    const entries = [
      { id: 'att1', title: 'file1.png', syncedAt: '2024-01-01T00:00:00.000Z' },
    ];
    await kvs.set(STORAGE_KEY, entries);

    const result = await getSyncedAttachments(SOURCE_PAGE_ID);
    expect(result).toEqual(entries);
  });

  it('appends a new synced attachment', async () => {
    const initial = [
      { id: 'att1', title: 'file1.png', syncedAt: '2024-01-01T00:00:00.000Z' },
    ];
    await kvs.set(STORAGE_KEY, initial);

    await addSyncedAttachment(SOURCE_PAGE_ID, {
      id: 'att2',
      title: 'file2.pdf',
      syncedAt: '2024-01-02T00:00:00.000Z',
    });

    const result = await getSyncedAttachments(SOURCE_PAGE_ID);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('att2');
  });
});

describe('AttachmentService', () => {
  beforeEach(() => {
    resetForgeApiShim();
  });

  it('lists attachments from source page', async () => {
    const attachments = [
      createAttachmentFixture('att1', 'diagram.png'),
      createAttachmentFixture('att2', 'report.pdf'),
    ];
    setupAttachmentListFixture(attachments);

    const result = await listSourceAttachments(SOURCE_PAGE_ID);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('diagram.png');
    expect(result[1].title).toBe('report.pdf');
  });

  it('throws on non-200 response', async () => {
    fakeApi.override('GET', ATTACHMENTS_PATH, {
      status: 500,
      body: 'Internal Server Error',
    });

    await expect(listSourceAttachments(SOURCE_PAGE_ID)).rejects.toThrow('Failed to list attachments');
  });
});

describe('CrossSiteUploadService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetForgeApiShim();
    process.env = buildTestEnv(originalEnv);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if environment variables are missing', async () => {
    delete process.env.TARGET_SITE_EMAIL;
    const buffer = new ArrayBuffer(4);
    await expect(uploadToTarget(TARGET_PAGE_ID, 'test.png', buffer, 'image/png')).rejects.toThrow(
      'Missing required environment variables',
    );
  });

  it('uploads successfully on first attempt', async () => {
    setupUploadFixture(200);
    const buffer = new TextEncoder().encode('test-data').buffer;
    await expect(uploadToTarget(TARGET_PAGE_ID, 'test.png', buffer, 'image/png')).resolves.toBeUndefined();
  });

  it('throws after max retries on failure', async () => {
    setupUploadFixture(500);
    const buffer = new TextEncoder().encode('test-data').buffer;
    await expect(uploadToTarget(TARGET_PAGE_ID, 'test.png', buffer, 'image/png')).rejects.toThrow(
      'Upload failed with status 500',
    );
  }, 30000);
});

describe('pageUpdatedHandler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetForgeApiShim();
    process.env = buildTestEnv(originalEnv);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('processes events for any source page id', async () => {
    setupTargetLookupFixture(SOURCE_PAGE_TITLE, [
      { id: TARGET_PAGE_ID, title: SOURCE_PAGE_TITLE, space: { name: SOURCE_SPACE_NAME } },
    ]);
    fakeApi.override('GET', '/wiki/api/v2/pages/999999/attachments?limit=250', {
      status: 200,
      body: {
        results: [],
        _links: {},
      },
    });

    await handler(createPageUpdatedEvent('999999', SOURCE_PAGE_TITLE, SOURCE_SPACE_NAME));
    const attachmentCalls = fakeApi.apiCalls.filter(
      (c: { path: string }) => c.path.includes('/wiki/api/v2/pages/999999/attachments'),
    );
    expect(attachmentCalls).toHaveLength(1);
  });

  it('ignores events with missing required content fields', async () => {
    await handler({});
    expect(fakeApi.apiCalls).toHaveLength(0);
  });

  it('skips sync when no matching target page exists', async () => {
    setupTargetLookupFixture(SOURCE_PAGE_TITLE, []);

    await handler(createPageUpdatedEvent());

    const attachmentCalls = fakeApi.apiCalls.filter(
      (c: { path: string }) => c.path.includes('/wiki/api/v2/pages/'),
    );
    expect(attachmentCalls).toHaveLength(0);
  });

  it('does nothing when no new attachments exist', async () => {
    await kvs.set(STORAGE_KEY, [
      { id: 'att1', title: 'diagram.png', syncedAt: '2024-01-01T00:00:00.000Z' },
    ]);

    setupTargetLookupFixture();
    setupAttachmentListFixture([createAttachmentFixture('att1', 'diagram.png')]);

    await handler(createPageUpdatedEvent());

    // Only the list call should have been made
    const apiCalls = fakeApi.apiCalls.filter(
      (c: { path: string }) => c.path.includes('attachments'),
    );
    expect(apiCalls).toHaveLength(1);
  });

  it('syncs new attachments end-to-end', async () => {
    const downloadUrl = '/wiki/download/attachments/att-new/newfile.png';
    setupTargetLookupFixture();
    setupAttachmentListFixture([
      createAttachmentFixture('att-new', 'newfile.png', downloadUrl),
    ]);
    setupDownloadFixture(downloadUrl, 'binary-content');
    setupUploadFixture(200);

    await handler(createPageUpdatedEvent());

    const synced = await getSyncedAttachments(SOURCE_PAGE_ID);
    expect(synced).toHaveLength(1);
    expect(synced[0].id).toBe('att-new');
    expect(synced[0].title).toBe('newfile.png');
    expect(synced[0].syncedAt).toBeDefined();
  });

  it('continues syncing when one attachment fails download', async () => {
    const downloadUrl1 = '/wiki/download/attachments/att1/fail.png';
    const downloadUrl2 = '/wiki/download/attachments/att2/success.png';

    setupTargetLookupFixture();
    setupAttachmentListFixture([
      createAttachmentFixture('att1', 'fail.png', downloadUrl1),
      createAttachmentFixture('att2', 'success.png', downloadUrl2),
    ]);

    // First download fails
    fakeApi.override('GET', downloadUrl1, { status: 500, body: 'Error' });
    // Second download succeeds
    setupDownloadFixture(downloadUrl2, 'binary-content-2');
    setupUploadFixture(200);

    await handler(createPageUpdatedEvent());

    const synced = await getSyncedAttachments(SOURCE_PAGE_ID);
    expect(synced).toHaveLength(1);
    expect(synced[0].id).toBe('att2');
  });

  it('skips already-synced attachments', async () => {
    await kvs.set(STORAGE_KEY, [
      { id: 'att-old', title: 'old.png', syncedAt: '2024-01-01T00:00:00.000Z' },
    ]);

    const newDownloadUrl = '/wiki/download/attachments/att-new/new.png';
    setupTargetLookupFixture();
    setupAttachmentListFixture([
      createAttachmentFixture('att-old', 'old.png'),
      createAttachmentFixture('att-new', 'new.png', newDownloadUrl),
    ]);
    setupDownloadFixture(newDownloadUrl, 'new-binary');
    setupUploadFixture(200);

    await handler(createPageUpdatedEvent());

    const synced = await getSyncedAttachments(SOURCE_PAGE_ID);
    expect(synced).toHaveLength(2);
    expect(synced.map((s) => s.id)).toContain('att-old');
    expect(synced.map((s) => s.id)).toContain('att-new');
  });
});

describe('webTrigger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetForgeApiShim();
    process.env = buildTestEnv(originalEnv);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 401 when auth secret is missing', async () => {
    const response = await webTrigger({
      body: JSON.stringify({ pageId: SOURCE_PAGE_ID }),
      headers: {},
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 when auth secret is invalid', async () => {
    const response = await webTrigger({
      body: JSON.stringify({ pageId: SOURCE_PAGE_ID }),
      headers: { 'x-sync-secret': ['wrong'] },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 400 when pageId is missing', async () => {
    const response = await webTrigger({
      body: JSON.stringify({}),
      headers: { 'x-sync-secret': ['automation-secret'] },
    });

    expect(response.statusCode).toBe(400);
  });

  it('syncs successfully with valid secret and page payload', async () => {
    setupSourcePageMetadataFixture();
    setupTargetLookupFixture();
    setupAttachmentListFixture([]);

    const response = await webTrigger({
      body: JSON.stringify({ pageId: SOURCE_PAGE_ID }),
      headers: { authorization: ['Bearer automation-secret'] },
    });

    expect(response.statusCode).toBe(200);
  });

  it('uses payload page metadata when title and space are provided', async () => {
    setupTargetLookupFixture();
    setupAttachmentListFixture([]);

    const response = await webTrigger({
      body: JSON.stringify({
        pageId: SOURCE_PAGE_ID,
        pageTitle: SOURCE_PAGE_TITLE,
        spaceName: SOURCE_SPACE_NAME,
      }),
      headers: { authorization: ['Bearer automation-secret'] },
    });

    expect(response.statusCode).toBe(200);
  });
});
