# ScrapeSentry agent context

Use the existing Bright Data Scraper Studio collector. Do not create a replacement collector unless the project owner asks for one.

- Collector ID: `c_msxcshnz2bwrroekf3`
- Public target: `https://books.toscrape.com/`
- Product role: production API for the contract monitor, protected feed and Self-Healing workflow
- Live smoke command: `APP_ENV=production BRIGHTDATA_API_TOKEN=... python -m app.live_smoke`
- MCP server command: `python -m app.server`
- Full local check: `make verify`

Keep Bright Data tokens in environment variables or repository secrets. Never print them, commit them or place them in browser-exposed variables.

Treat live collections and Self-Healing operations as provider actions that consume credits. Use the recorded production artifact for deterministic tests. Use the live adapter only when a real provider check is intended.

Do not use Oxford commas. Do not use em dashes.
