# Confluence Attachment Sync (Forge)

This Forge app syncs new attachments from a source Confluence page to a matching target Confluence page (matched by page title + space name).

## How it works

1. An Atlassian Automation rule on the **source** site calls this app’s web trigger when attachments are added.
2. The app reads attachments from the source page.
3. It finds a target page with the **same title and space name** on the **target** site.
4. It uploads any attachments that have not already been synced (tracked in Forge KVS).

The Forge app is typically **installed on the source Confluence site**. Target (and optionally source) Confluence APIs are called with Basic Auth using API tokens stored as Forge environment variables.

---

## Install and configure on another site

Use these steps whenever you want to run the app against a different source/target pair (for example, moving from a sandbox to a customer site).

### Prerequisites

- Node.js 20+
- Forge CLI (`npm install -g @forge/cli`) and `forge login`
- Admin access on the **source** Confluence site (to install the app and create Automation rules)
- An Atlassian account with permission to read attachments on the source site and create attachments on the target site
- API tokens for those accounts ([create an API token](https://id.atlassian.com/manage-profile/security/api-tokens))

### 1. Install dependencies

```bash
npm install
```

### 2. Allow egress to your Confluence hosts

In `manifest.yml`, list every Confluence hostname the app will call (source and target):

```yaml
permissions:
  external:
    fetch:
      backend:
        - address: <your-source-site.atlassian.net>
        - address: <your-target-site.atlassian.net>
```

Redeploy after changing egress hosts — Forge will not allow outbound calls to hosts that are not listed.

### 3. Set Forge environment variables

Variables are **per environment** (`development`, `staging`, `production`). Setting them once for development does **not** copy them to production. After any variable change, you must `forge deploy` again for that environment.

```bash
# Replace development with staging or production as needed (-e <env>)
ENV=development

forge variables set -e "$ENV" TARGET_SITE_URL "https://<your-target-site>.atlassian.net"
forge variables set -e "$ENV" SOURCE_SITE_URL "https://<your-source-site>.atlassian.net"

forge variables set -e "$ENV" --encrypt WEB_TRIGGER_SECRET "<strong shared secret>"
forge variables set -e "$ENV" --encrypt SOURCE_SITE_EMAIL "<admin email for source site>"
forge variables set -e "$ENV" --encrypt SOURCE_SITE_API_TOKEN "<source site API token>"
forge variables set -e "$ENV" --encrypt TARGET_SITE_EMAIL "<admin email for target site>"
forge variables set -e "$ENV" --encrypt TARGET_SITE_API_TOKEN "<target site API token>"
```

| Variable | Required | Notes |
| --- | --- | --- |
| `TARGET_SITE_URL` | Yes | Site root only (e.g. `https://acme.atlassian.net`). No trailing `/wiki`. |
| `TARGET_SITE_EMAIL` | Yes | Account that can create attachments on the target site. |
| `TARGET_SITE_API_TOKEN` | Yes | Raw API token for that account (not an encrypted password manager export). |
| `WEB_TRIGGER_SECRET` | Yes | Secret you create; Automation must send the same value. |
| `SOURCE_SITE_URL` | Recommended | When set with email + token, source reads use direct REST instead of Forge `asApp()`. |
| `SOURCE_SITE_EMAIL` | Recommended | Admin/read account on the source site. |
| `SOURCE_SITE_API_TOKEN` | Recommended | Raw API token for the source account. |

If `SOURCE_SITE_URL`, `SOURCE_SITE_EMAIL`, and `SOURCE_SITE_API_TOKEN` are all set, the app reads source page metadata and attachments from that site over REST. Otherwise it uses Forge app identity (`asApp()`) on the installation site.

### 4. Deploy and install

```bash
# Development
forge deploy
forge install --product Confluence --site https://<your-source-site>.atlassian.net

# Production (example)
forge deploy -e production
forge install -e production --product Confluence --site https://<your-source-site>.atlassian.net
```

If the app is already installed on that site and you only changed code or variables, use `forge deploy` (and `forge install --upgrade` if scopes/egress changed).

### 5. Create the web trigger URL

```bash
forge webtrigger create --functionKey sync-web-trigger
```

Select the installation (site + Confluence + environment). Save the URL — you will paste it into Automation.

You can list existing URLs with `forge webtrigger list`.

### 6. Configure Atlassian Automation on the source site

On the **source** Confluence site, create an Automation rule, for example:

1. **Trigger:** Attachment added (or a schedule / manual trigger for testing).
2. **Action:** Send web request
   - **URL:** the web trigger URL from step 5
   - **Method:** `POST`
   - **Headers:**
     - `Authorization`: `Bearer <same value as WEB_TRIGGER_SECRET>`
     - `Content-Type`: `application/json`
   - **Body** (recommended — avoids an extra source metadata lookup):

     ```json
     {
       "pageId": "{{content.id}}",
       "pageTitle": "{{content.title}}",
       "spaceName": "{{content.space.name}}"
     }
     ```

     Exact smart values depend on your trigger; adjust field names if your Automation context differs. Minimum body:

     ```json
     {
       "pageId": "{{content.id}}"
     }
     ```

`WEB_TRIGGER_SECRET` must match the bearer token (or `x-sync-secret` header). Requests without a valid secret receive `401`/`403`.

### 7. Prepare matching pages on the target site

Target matching is by **exact page title + space name** (case-insensitive). Before syncing:

- Create a space on the target site with the **same space name** as the source space.
- Create a page with the **same title** as the source page.
- Ensure the target API account can view that space and add attachments.

If zero or multiple matches are found, the sync is skipped for that page.

### Checklist for a new site pair

- [ ] Egress hosts in `manifest.yml` include both sites
- [ ] All Forge variables set for the intended environment (`-e`)
- [ ] Secrets set with `--encrypt`
- [ ] `forge deploy` run **after** setting variables
- [ ] App installed on the source Confluence site
- [ ] Web trigger URL created for that installation
- [ ] Automation rule sends `Authorization: Bearer <WEB_TRIGGER_SECRET>`
- [ ] Target space name and page title match the source

---

## Web trigger payload

Minimum payload:

```json
{
  "pageId": "1671217"
}
```

Recommended payload (avoids source metadata lookup when provided):

```json
{
  "pageId": "1671217",
  "pageTitle": "Attachment Source Page",
  "spaceName": "Source Space"
}
```

Optional: restrict sync to specific attachment IDs:

```json
{
  "pageId": "1671217",
  "attachmentIds": ["att41811990", "att42008577"]
}
```

Authentication (either header works):

- `Authorization: Bearer <WEB_TRIGGER_SECRET>`
- `x-sync-secret: <WEB_TRIGGER_SECRET>`

---

## Required scopes

The manifest should include at least:

- `read:page:confluence`
- `read:space:confluence`
- `read:confluence-content.summary`
- `read:attachment:confluence`
- `storage:app`

---

## Runtime behavior

- Source attachments are read either:
  - from Forge app context (`asApp()`), or
  - directly from the source site using `SOURCE_SITE_*` credentials when configured.
- Target upload uses authenticated Confluence REST attachment upload (`TARGET_SITE_*`).
- Sync history is stored in Forge KVS by source page ID to avoid re-uploading already synced attachments.

---

## Development

### Validate

```bash
npm run ci  # manifest + type-check + tests + lint + security
```

### Useful commands

```bash
npm run type-check
npm run lint
npm run lint:fix
npm run test
npm run test:watch
npm run test:coverage
```

### Project notes

- Backend sync logic: `src/resolvers/index.ts`
- Resolver tests: `src/resolvers/__tests__/index.test.ts`
- Integration tests: `src/__tests__/integration.test.ts`
- The override in `package.json` for `@atlaskit/tokens` forces transitive dependencies onto one version to keep the app size down.

### Template structure

```
src/
├── index.ts              # Main entry point and resolver exports
├── resolvers/            # Backend resolver functions
│   ├── index.ts          # Sync + web trigger implementation
│   └── __tests__/        # Resolver tests
├── frontend/             # React frontend (if present)
│   ├── index.tsx
│   └── __tests__/
└── setupTests.ts         # Jest test configuration
```

---

## Learn more

- [Forge Documentation](https://developer.atlassian.com/platform/forge/)
- [Forge web triggers](https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/)
- [Forge environment variables](https://developer.atlassian.com/platform/forge/environments-and-versions/#environment-variables)
