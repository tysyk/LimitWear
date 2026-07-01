#!/usr/bin/env node

const DEFAULT_WEB_ROUTES = ['/', '/login', '/register'];

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const apiUrl = normalizeBaseUrl(options.apiUrl ?? process.env.SMOKE_API_URL);
const webUrl = normalizeBaseUrl(options.webUrl ?? process.env.SMOKE_WEB_URL);
const webRoutes = parseRoutes(options.webRoutes ?? process.env.SMOKE_WEB_ROUTES);

if (!apiUrl || !webUrl) {
  console.error(
    'Missing smoke target. Set SMOKE_API_URL and SMOKE_WEB_URL or pass --api-url and --web-url.',
  );
  printHelp();
  process.exit(1);
}

if (options.dryRun) {
  console.log('Production smoke configuration is valid.');
  console.log(`API: ${apiUrl}`);
  console.log(`Web: ${webUrl}`);
  console.log(`Web routes: ${webRoutes.join(', ')}`);
  process.exit(0);
}

const checks = [
  {
    name: 'API health',
    run: () => checkApiHealth(apiUrl),
  },
  ...webRoutes.map((route) => ({
    name: `Web route ${route}`,
    run: () => checkHttpOk(new URL(route, webUrl).toString()),
  })),
];

let failed = 0;

for (const check of checks) {
  try {
    const detail = await check.run();
    console.log(`PASS ${check.name}${detail ? ` - ${detail}` : ''}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : 'unknown failure';
    console.error(`FAIL ${check.name} - ${message}`);
  }
}

if (failed > 0) {
  console.error(`Production smoke failed: ${failed}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`Production smoke passed: ${checks.length}/${checks.length} checks passed.`);

async function checkApiHealth(baseUrl) {
  const response = await fetchWithTimeout(new URL('/health', baseUrl).toString());

  if (!response.ok) {
    throw new Error(`expected 2xx health response, got ${response.status}`);
  }

  const payload = await response.json().catch(() => {
    throw new Error('health response is not valid JSON');
  });

  if (payload?.status !== 'ok') {
    throw new Error(`health status is ${JSON.stringify(payload?.status)}`);
  }

  const databaseStatus = payload?.checks?.database;
  if (databaseStatus && databaseStatus !== 'connected') {
    throw new Error(`database check is ${JSON.stringify(databaseStatus)}`);
  }

  return databaseStatus ? `database=${databaseStatus}` : 'status=ok';
}

async function checkHttpOk(url) {
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`expected 2xx response, got ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'unknown';
  return `status=${response.status}, content-type=${contentType}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`request timed out for ${url}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseArgs(args) {
  const parsed = {
    apiUrl: undefined,
    dryRun: false,
    help: false,
    webRoutes: undefined,
    webUrl: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }

    if (arg === '--api-url') {
      parsed.apiUrl = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--web-url') {
      parsed.webUrl = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--web-routes') {
      parsed.webRoutes = args[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function normalizeBaseUrl(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const url = new URL(trimmed);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Smoke URL must use http or https: ${trimmed}`);
  }

  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }

  return url.toString();
}

function parseRoutes(value) {
  if (!value?.trim()) {
    return DEFAULT_WEB_ROUTES;
  }

  return value
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean)
    .map((route) => (route.startsWith('/') ? route : `/${route}`));
}

function printHelp() {
  console.log(`
Usage:
  npm run smoke:production -- --api-url https://api.example.com --web-url https://example.com

Environment:
  SMOKE_API_URL=https://api.example.com
  SMOKE_WEB_URL=https://example.com
  SMOKE_WEB_ROUTES=/,/login,/register

Options:
  --api-url <url>      Backend base URL.
  --web-url <url>      Frontend base URL.
  --web-routes <csv>   Comma-separated frontend paths. Defaults to /,/login,/register.
  --dry-run            Validate configuration without making requests.
`);
}
