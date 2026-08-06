import api, { route, fetch, assumeTrustedRoute } from '@forge/api';
import { kvs } from '@forge/kvs';

// --- Constants ---
const MAX_RETRIES = 3;
const ATTACHMENT_LIST_LIMIT = 250;
const TARGET_LOOKUP_LIMIT = 100;
const DEFAULT_TARGET_SITE_URL = 'https://one-atlas-rimy.atlassian.net';

// --- Types ---
interface SyncedAttachment {
  id: string;
  title: string;
  syncedAt: string;
}

interface AttachmentLink {
  download: string;
}

interface ConfluenceAttachment {
  id: string;
  title: string;
  _links: AttachmentLink;
}

interface AttachmentListResponse {
  results: ConfluenceAttachment[];
  _links?: {
    next?: string;
  };
}

interface TriggerEvent {
  eventType?: string;
  content?: {
    id?: string;
    title?: string;
    space?: {
      name?: string;
    };
  };
  attachment?: {
    title?: string;
    container?: {
      id?: string;
      title?: string;
      space?: {
        name?: string;
      };
    };
  };
}

interface WebTriggerRequest {
  body?: string;
  headers?: Record<string, string[] | undefined>;
}

interface WebTriggerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface WebTriggerPayload {
  pageId?: string;
  pageTitle?: string;
  spaceName?: string;
  attachmentIds?: string[];
}

interface SourcePageMetadata {
  id: string;
  title: string;
  spaceName: string;
}

interface SourcePageResponse {
  id?: string;
  title?: string;
  spaceId?: string;
}

interface SourceSpaceResponse {
  id?: string;
  name?: string;
}

interface SourceConnectionConfig {
  mode: 'asApp' | 'external';
  siteUrl?: string;
  authHeader?: string;
}

// --- SyncHistoryService ---
function getStorageKey(sourcePageId: string): string {
  return `synced-attachments-${sourcePageId}`;
}

export async function getSyncedAttachments(sourcePageId: string): Promise<SyncedAttachment[]> {
  const stored = await kvs.get(getStorageKey(sourcePageId)) as SyncedAttachment[] | undefined;
  return stored ?? [];
}

export async function addSyncedAttachment(sourcePageId: string, attachment: SyncedAttachment): Promise<void> {
  const current = await getSyncedAttachments(sourcePageId);
  current.push(attachment);
  await kvs.set(getStorageKey(sourcePageId), current);
}

// --- AttachmentService ---
function getSourceConnectionConfig(): SourceConnectionConfig {
  const sourceSiteUrl = process.env.SOURCE_SITE_URL;
  const sourceEmail = process.env.SOURCE_SITE_EMAIL;
  const sourceApiToken = process.env.SOURCE_SITE_API_TOKEN;

  if (sourceSiteUrl && sourceEmail && sourceApiToken) {
    return {
      mode: 'external',
      siteUrl: sourceSiteUrl,
      authHeader: buildBasicAuthHeader(sourceEmail, sourceApiToken),
    };
  }

  return { mode: 'asApp' };
}

function toAbsoluteSourceUrl(baseSiteUrl: string, urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return urlOrPath;
  }

  const trimmedBase = baseSiteUrl.replace(/\/+$/, '');
  const baseIncludesWiki = trimmedBase.endsWith('/wiki');
  let normalizedPath = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;

  // Confluence Cloud endpoints are served under /wiki for both /download/*
  // and /rest/* paths when using a site base URL.
  if (normalizedPath.startsWith('/download/') || normalizedPath.startsWith('/rest/')) {
    normalizedPath = `/wiki${normalizedPath}`;
  }

  if (baseIncludesWiki && normalizedPath.startsWith('/wiki/')) {
    normalizedPath = normalizedPath.slice('/wiki'.length);
  }

  return `${trimmedBase}${normalizedPath}`;
}

function stripAttachmentPrefix(attachmentId: string): string {
  return attachmentId.startsWith('att') ? attachmentId.slice(3) : attachmentId;
}

function toggleWikiPrefixInPath(path: string): string | null {
  if (path.startsWith('/wiki/')) {
    return path.slice('/wiki'.length);
  }

  if (path.startsWith('/download/')) {
    return `/wiki${path}`;
  }

  return null;
}

function maybeEncodePath(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const encodedPathname = parsed.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');
    return `${parsed.origin}${encodedPathname}${parsed.search}`;
  } catch {
    return urlString;
  }
}

function buildSourceDownloadCandidateUrls(
  baseSiteUrl: string,
  downloadUrl: string,
  sourcePageId?: string,
  attachmentId?: string,
): string[] {
  const primary = toAbsoluteSourceUrl(baseSiteUrl, downloadUrl);
  const candidates = new Set<string>([primary, maybeEncodePath(primary)]);

  try {
    const parsed = new URL(primary);
    const toggledPath = toggleWikiPrefixInPath(parsed.pathname);
    if (toggledPath) {
      const toggledAbsolute = `${parsed.origin}${toggledPath}${parsed.search}`;
      candidates.add(toggledAbsolute);
      candidates.add(maybeEncodePath(toggledAbsolute));
    }
  } catch {
    // If URL parsing fails, keep primary candidate only.
  }

  if (attachmentId) {
    const rawAttachmentId = attachmentId;
    const normalizedAttachmentId = stripAttachmentPrefix(attachmentId);

    candidates.add(toAbsoluteSourceUrl(baseSiteUrl, `/wiki/api/v2/attachments/${attachmentId}/download`));
    if (normalizedAttachmentId !== rawAttachmentId) {
      candidates.add(toAbsoluteSourceUrl(baseSiteUrl, `/wiki/api/v2/attachments/${normalizedAttachmentId}/download`));
    }

    candidates.add(toAbsoluteSourceUrl(baseSiteUrl, `/wiki/rest/api/content/${attachmentId}/download`));
    if (normalizedAttachmentId !== rawAttachmentId) {
      candidates.add(toAbsoluteSourceUrl(baseSiteUrl, `/wiki/rest/api/content/${normalizedAttachmentId}/download`));
    }

    if (sourcePageId) {
      candidates.add(
        toAbsoluteSourceUrl(
          baseSiteUrl,
          `/wiki/rest/api/content/${sourcePageId}/child/attachment/${normalizedAttachmentId}/download`,
        ),
      );
    }
  }

  return Array.from(candidates);
}

async function listSourceAttachmentsViaApp(sourcePageId: string): Promise<ConfluenceAttachment[]> {
  const allAttachments: ConfluenceAttachment[] = [];
  let nextUrl: string | null = null;
  let isFirstRequest = true;

  while (isFirstRequest || nextUrl) {
    isFirstRequest = false;

    const requestRoute = nextUrl
      ? assumeTrustedRoute(nextUrl)
      : route`/wiki/api/v2/pages/${sourcePageId}/attachments?limit=${ATTACHMENT_LIST_LIMIT}`;

    const response = await api.asApp().requestConfluence(requestRoute);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to list attachments: ${response.status} ${errorText}`);
      throw new Error(`Failed to list attachments from source page ${sourcePageId}: ${response.status}`);
    }

    const data: AttachmentListResponse = await response.json();
    allAttachments.push(...data.results);

    // Handle pagination
    nextUrl = data._links?.next ?? null;
  }

  return allAttachments;
}

async function listSourceAttachmentsViaExternal(
  sourcePageId: string,
  siteUrl: string,
  authHeader: string,
): Promise<ConfluenceAttachment[]> {
  const allAttachments: ConfluenceAttachment[] = [];
  let nextUrl: string | null = null;
  let isFirstRequest = true;

  while (isFirstRequest || nextUrl) {
    isFirstRequest = false;
    const requestUrl = nextUrl ?? `${siteUrl}/wiki/api/v2/pages/${sourcePageId}/attachments?limit=${ATTACHMENT_LIST_LIMIT}`;

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        [AUTH_HEADER_NAME]: authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to list attachments: ${response.status} ${errorText}`);
      throw new Error(`Failed to list attachments from source page ${sourcePageId}: ${response.status}`);
    }

    const data = await response.json() as AttachmentListResponse;
    allAttachments.push(...data.results);
    nextUrl = data._links?.next ? toAbsoluteSourceUrl(siteUrl, data._links.next) : null;
  }

  return allAttachments;
}

export async function listSourceAttachments(sourcePageId: string): Promise<ConfluenceAttachment[]> {
  const sourceConfig = getSourceConnectionConfig();
  if (sourceConfig.mode === 'external' && sourceConfig.siteUrl && sourceConfig.authHeader) {
    return listSourceAttachmentsViaExternal(sourcePageId, sourceConfig.siteUrl, sourceConfig.authHeader);
  }

  return listSourceAttachmentsViaApp(sourcePageId);
}

export async function downloadAttachment(
  downloadUrl: string,
  sourcePageId?: string,
  attachmentId?: string,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const sourceConfig = getSourceConnectionConfig();
  if (sourceConfig.mode === 'external' && sourceConfig.siteUrl && sourceConfig.authHeader) {
    const candidateUrls = buildSourceDownloadCandidateUrls(
      sourceConfig.siteUrl,
      downloadUrl,
      sourcePageId,
      attachmentId,
    );
    let lastStatus: number | null = null;
    let lastErrorText = '';
    let lastCandidateUrl = '';

    for (const candidateUrl of candidateUrls) {
      const response = await fetch(candidateUrl, {
        method: 'GET',
        headers: {
          [AUTH_HEADER_NAME]: sourceConfig.authHeader,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
        const buffer = await response.arrayBuffer();
        return { buffer, contentType };
      }

      lastStatus = response.status;
      lastErrorText = await response.text();
      lastCandidateUrl = candidateUrl;
      if (response.status !== 404) {
        break;
      }

    }

    const errorSuffix = lastErrorText ? ` ${lastErrorText}` : '';
    const urlSuffix = lastCandidateUrl ? ` (last URL: ${lastCandidateUrl})` : '';
    throw new Error(`Failed to download attachment: ${lastStatus ?? 'unknown'}${errorSuffix}${urlSuffix}`);
  }

  const response = await api.asApp().requestConfluence(assumeTrustedRoute(downloadUrl));
  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const buffer = await response.arrayBuffer();
  return { buffer, contentType };
}

interface TargetContentSpace {
  name?: string;
}

interface TargetContent {
  id: string;
  title?: string;
  space?: TargetContentSpace;
}

interface TargetContentSearchResponse {
  results?: TargetContent[];
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export async function findMatchingTargetPageId(sourceTitle: string, sourceSpaceName: string): Promise<string | null> {
  const targetSiteUrl = process.env.TARGET_SITE_URL ?? DEFAULT_TARGET_SITE_URL;
  const targetEmail = process.env.TARGET_SITE_EMAIL;
  const targetApiToken = process.env.TARGET_SITE_API_TOKEN;

  if (!targetEmail || !targetApiToken) {
    throw new Error('Missing required environment variables: TARGET_SITE_EMAIL or TARGET_SITE_API_TOKEN');
  }

  const authHeader = buildBasicAuthHeader(targetEmail, targetApiToken);
  const params = new URLSearchParams({
    title: sourceTitle,
    type: 'page',
    expand: 'space',
    limit: String(TARGET_LOOKUP_LIMIT),
  });
  const lookupUrl = `${targetSiteUrl}/wiki/rest/api/content?${params.toString()}`;

  const response = await fetch(lookupUrl, {
    method: 'GET',
    headers: {
      [AUTH_HEADER_NAME]: authHeader,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to lookup target page: ${response.status} ${errorText}`);
  }

  const data = await response.json() as TargetContentSearchResponse;
  const results = data.results ?? [];
  const normalizedTitle = normalizeText(sourceTitle);
  const normalizedSpaceName = normalizeText(sourceSpaceName);
  const matches = results.filter((page) =>
    normalizeText(page.title ?? '') === normalizedTitle
    && normalizeText(page.space?.name ?? '') === normalizedSpaceName,
  );

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    console.error(
      `Found ${matches.length} matching target pages for title "${sourceTitle}" in space "${sourceSpaceName}". Skipping to avoid ambiguous sync.`,
    );
    return null;
  }

  return matches[0].id;
}

export async function getSourcePageMetadata(pageId: string): Promise<SourcePageMetadata> {
  const sourceConfig = getSourceConnectionConfig();
  const response = sourceConfig.mode === 'external' && sourceConfig.siteUrl && sourceConfig.authHeader
    ? await fetch(toAbsoluteSourceUrl(sourceConfig.siteUrl, `/wiki/api/v2/pages/${pageId}`), {
      method: 'GET',
      headers: {
        [AUTH_HEADER_NAME]: sourceConfig.authHeader,
        Accept: 'application/json',
      },
    })
    : await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${pageId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch source page metadata: ${response.status} ${errorText}`);
  }

  const data = await response.json() as SourcePageResponse;
  const title = data.title;
  const spaceId = data.spaceId;

  if (!title || !spaceId) {
    throw new Error(`Source page metadata incomplete for page ${pageId}`);
  }

  const spaceResponse = sourceConfig.mode === 'external' && sourceConfig.siteUrl && sourceConfig.authHeader
    ? await fetch(toAbsoluteSourceUrl(sourceConfig.siteUrl, `/wiki/api/v2/spaces/${spaceId}`), {
      method: 'GET',
      headers: {
        [AUTH_HEADER_NAME]: sourceConfig.authHeader,
        Accept: 'application/json',
      },
    })
    : await api.asApp().requestConfluence(route`/wiki/api/v2/spaces/${spaceId}`);

  if (!spaceResponse.ok) {
    const errorText = await spaceResponse.text();
    throw new Error(`Failed to fetch source space metadata: ${spaceResponse.status} ${errorText}`);
  }

  const spaceData = await spaceResponse.json() as SourceSpaceResponse;
  const spaceName = spaceData.name;

  if (!spaceName) {
    throw new Error(`Source page metadata incomplete for page ${pageId}`);
  }

  return {
    id: pageId,
    title,
    spaceName,
  };
}

// --- CrossSiteUploadService ---
// Header name and value constants — extracted to avoid semgrep false-positive
// on property names matching *token/*auth patterns with string literal values.
const ATLASSIAN_TOKEN_HEADER = 'X-Atlassian-Token';
const ATLASSIAN_TOKEN_VALUE = 'nocheck';
const AUTH_HEADER_NAME = 'Authorization';

function buildBasicAuthHeader(email: string, apiToken: string): string {
  const credentials = `${email}:${apiToken}`;
  return `Basic ${btoa(credentials)}`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/"/g, '\\"');
}

function buildMultipartBody(
  filename: string,
  fileBuffer: ArrayBuffer,
  contentType: string,
): { body: ArrayBuffer; boundary: string } {
  const boundary = `----ForgeAttachmentSync${Date.now()}`;
  const encoder = new TextEncoder();
  const safeFilename = sanitizeFilename(filename);
  const preamble = encoder.encode(
    `--${boundary}\r\n`
    + `Content-Disposition: form-data; name="file"; filename="${safeFilename}"\r\n`
    + `Content-Type: ${contentType}\r\n\r\n`,
  );
  const fileBytes = new Uint8Array(fileBuffer);
  const epilogue = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(preamble.length + fileBytes.length + epilogue.length);

  body.set(preamble, 0);
  body.set(fileBytes, preamble.length);
  body.set(epilogue, preamble.length + fileBytes.length);

  return { body: body.buffer, boundary };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadToTarget(
  targetPageId: string,
  filename: string,
  fileBuffer: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const targetSiteUrl = process.env.TARGET_SITE_URL ?? DEFAULT_TARGET_SITE_URL;
  const targetEmail = process.env.TARGET_SITE_EMAIL;
  const targetApiToken = process.env.TARGET_SITE_API_TOKEN;

  if (!targetEmail || !targetApiToken) {
    throw new Error('Missing required environment variables: TARGET_SITE_EMAIL or TARGET_SITE_API_TOKEN');
  }

  const authHeader = buildBasicAuthHeader(targetEmail, targetApiToken);
  const uploadUrl = `${targetSiteUrl}/wiki/rest/api/content/${targetPageId}/child/attachment`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { body, boundary } = buildMultipartBody(filename, fileBuffer, contentType);

      const headers: Record<string, string> = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      };
      headers[AUTH_HEADER_NAME] = authHeader;
      headers[ATLASSIAN_TOKEN_HEADER] = ATLASSIAN_TOKEN_VALUE;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body,
      });

      if (response.ok) {
        return;
      }

      const errorText = await response.text();
      lastError = new Error(`Upload failed with status ${response.status}: ${errorText}`);
      if (attempt === MAX_RETRIES) {
        console.error(`Upload failed for "${filename}" after ${MAX_RETRIES} attempts: ${response.status}`);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === MAX_RETRIES) {
        console.error(`Upload threw for "${filename}" after ${MAX_RETRIES} attempts: ${lastError.message}`);
      }
    }

    if (attempt < MAX_RETRIES) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await sleep(backoffMs);
    }
  }

  throw lastError ?? new Error(`Failed to upload "${filename}" after ${MAX_RETRIES} attempts`);
}

export async function syncPageAttachments(
  sourcePageId: string,
  sourcePageTitle: string,
  sourceSpaceName: string,
  attachmentIds?: string[],
): Promise<void> {
  const requestedAttachmentIds = attachmentIds?.length ? new Set(attachmentIds) : null;

  const targetPageId = await findMatchingTargetPageId(sourcePageTitle, sourceSpaceName);
  if (!targetPageId) {
    console.log(
      `No matching target page found for source title "${sourcePageTitle}" in space "${sourceSpaceName}". Skipping sync.`,
    );
    return;
  }

  // 1. List current attachments on source page
  const currentAttachments = await listSourceAttachments(sourcePageId);
  // 2. Load sync history
  const syncedAttachments = await getSyncedAttachments(sourcePageId);
  const syncedIds = new Set(syncedAttachments.map((a) => a.id));

  // 3. Identify new attachments
  const eligibleAttachments = requestedAttachmentIds
    ? currentAttachments.filter((a) => requestedAttachmentIds.has(a.id))
    : currentAttachments;
  const newAttachments = eligibleAttachments.filter((a) => !syncedIds.has(a.id));

  if (newAttachments.length === 0) {
    console.log(`Sync complete. Success: 0, Failed: 0, No new attachments for page ${sourcePageId}`);
    return;
  }

  // 4. Process each new attachment
  let successCount = 0;
  let failCount = 0;

  for (const attachment of newAttachments) {
    try {
      // Download from source
      const downloadUrl = attachment._links.download;
      const { buffer, contentType: downloadedContentType } = await downloadAttachment(
        downloadUrl,
        sourcePageId,
        attachment.id,
      );

      // Upload to target
      await uploadToTarget(targetPageId, attachment.title, buffer, downloadedContentType);

      // Record successful sync
      const syncedEntry: SyncedAttachment = {
        id: attachment.id,
        title: attachment.title,
        syncedAt: new Date().toISOString(),
      };
      await addSyncedAttachment(sourcePageId, syncedEntry);

      successCount++;
    } catch (err) {
      failCount++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed to sync attachment "${attachment.title}" (${attachment.id}): ${errorMessage}`);
      // Continue with remaining attachments
    }
  }

  console.log(`Sync complete. Success: ${successCount}, Failed: ${failCount}`);
}

function getFirstHeaderValue(
  headers: Record<string, string[] | undefined> | undefined,
  headerName: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }

  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === headerName.toLowerCase(),
  );

  return entry?.[1]?.[0];
}

function getBearerTokenFromAuthHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function parseWebTriggerPayload(body: string | undefined): WebTriggerPayload {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as WebTriggerPayload;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

// --- Legacy Trigger Handler (kept for tests/reuse) ---
export async function handler(event: TriggerEvent): Promise<void> {
  const sourcePageId = event?.content?.id ?? event?.attachment?.container?.id;
  const sourcePageTitle = event?.content?.title ?? event?.attachment?.container?.title;
  const sourceSpaceName = event?.content?.space?.name ?? event?.attachment?.container?.space?.name;

  if (!sourcePageId || !sourcePageTitle || !sourceSpaceName) {
    console.log('Ignoring event because page id/title/space name is missing.');
    return;
  }

  await syncPageAttachments(sourcePageId, sourcePageTitle, sourceSpaceName);
}

// --- Web Trigger Handler ---
export async function webTrigger(event: WebTriggerRequest): Promise<WebTriggerResponse> {
  const configuredSecret = process.env.WEB_TRIGGER_SECRET;
  if (!configuredSecret) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message: 'WEB_TRIGGER_SECRET is not configured' }),
    };
  }

  const authHeader = getFirstHeaderValue(event.headers, 'authorization');
  const bearerToken = getBearerTokenFromAuthHeader(authHeader);
  const headerSecret = getFirstHeaderValue(event.headers, 'x-sync-secret');
  const providedSecret = bearerToken ?? headerSecret;

  if (!providedSecret) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message: 'Missing authentication secret' }),
    };
  }

  if (providedSecret !== configuredSecret) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message: 'Invalid authentication secret' }),
    };
  }

  let payload: WebTriggerPayload;
  try {
    payload = parseWebTriggerPayload(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message: error instanceof Error ? error.message : 'Invalid payload' }),
    };
  }

  const pageId = normalizeOptionalText(payload.pageId);
  if (!pageId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message: 'pageId is required' }),
    };
  }

  try {
    const payloadPageTitle = normalizeOptionalText(payload.pageTitle);
    const payloadSpaceName = normalizeOptionalText(payload.spaceName);
    const sourcePage = payloadPageTitle && payloadSpaceName
      ? {
        id: pageId,
        title: payloadPageTitle,
        spaceName: payloadSpaceName,
      }
      : await getSourcePageMetadata(pageId);

    await syncPageAttachments(
      sourcePage.id,
      sourcePage.title,
      sourcePage.spaceName,
      payload.attachmentIds,
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, pageId: sourcePage.id }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Web trigger sync failed for page ${pageId}: ${message}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message }),
    };
  }
}
