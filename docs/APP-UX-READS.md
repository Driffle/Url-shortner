# App UX & read-path caching

See [Issue #36](https://github.com/Driffle/Url-shortner/issues/36).

## Analytics cache

- Redis keys: `{REDIS_KEY_PREFIX}:analytics:link:{scope}:{version}:…`
- TTL: `ANALYTICS_CACHE_TTL_SEC` (default **90** seconds)
- **Version bump:** each successful `POST /api/cron/rollup` increments `analytics:cache:version`, invalidating prior keys logically

## Data freshness

- **Clicks:** async worker (~seconds lag)
- **Rollups / unique visitors:** cron schedule (recommend every 5–15 min)
- **UI footnote** on Analytics explains lag

## Shell layout

- Viewport-locked: sidebar + header fixed; `main` scrolls (`h-dvh overflow-hidden` chain)
- Mobile: horizontal pill nav below header

## URL-driven filters

| Page | Params |
|------|--------|
| Analytics | `range`, `from`, `to`, `slug` |
| Dashboard | `range` (default `14d`) |
| Links | `q`, `status`, `page` |
| Campaigns | `page` |
