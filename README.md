# dealer-logic-pilot

Config files, a validator, and small Node.js servers for an ElevenLabs voice agent pilot that answers a car dealership's phone lines (sales, service, parts, after hours).

## Status

`experimental`

All five commits fall between 2025-09-04 and 2025-09-15. Nothing has been committed since. On 2026-09-10 the dependencies installed and three of the scripts ran, so the code is usable as reference. Nothing is deployed.

What does not work:

- `dealerlogic.io` and `www.dealerlogic.io` do not resolve in DNS (checked 2026-09-10). Every URL in `.env.production`, `caddy.json`, `dns-config.md`, and the deploy scripts points there.
- The Fly.io app in `fly.toml` (`dealer-logic`) no longer answers. `curl https://dealer-logic.fly.dev/` got a connection reset.
- `api/index.js`, the Vercel entry in `vercel.json`, spawns `api/api-server.js`, `api/webhook-server.js`, and `api/monitor.js`. None of those files exist; the real files are in `scripts/`.
- `netlify.toml` runs `npm run build` and expects `netlify/functions`. There is no `build` script and no `netlify/` directory.
- `.github/workflows/deploy.yml` health-checks `https://dealerlogic.io/health`, which cannot resolve. `fly-deploy.yml` only watches a `main` branch; the default branch is `master`.
- `npm test` (`scripts/test-calls.js`) is an interactive checklist that asks you to dial the configured phone numbers. It does not test code. Not run.
- The ElevenLabs code (`api/elevenlabs-agent.js`, `scripts/convai-integration.js`) was not run. No agent was created or called.

## Install and first run

Run on 2026-09-10 with Node v26.5.0 and npm 11.17.0. No `.env` file, no API keys.

```
git clone https://github.com/MichaelCrowe11/dealer-logic-pilot
cd dealer-logic-pilot
npm ci
npm run validate
```

Output, trimmed. Exit code 1 because no `.env` exists:

```
1. Validating Environment Variables
    DEALER_NAME: MISSING
    MAIN_NUMBER: MISSING
    SIP_PROVIDER: MISSING
    VOICE_ID_EN: MISSING
3. Validating Agent Configuration
    agent.reception: Configured
    agent.sales: Configured
    agent.service: Configured
    agent.parts: Configured
    agent.after_hours: Configured
  Total agents configured: 9
4. Validating Tool Endpoints
    createLead: Endpoint not configured (missing TOOL_CREATE_LEAD_URL)
7. Validating Integrations
    CRM integration incomplete
```

The dashboard server from the Dockerfile:

```
PORT=18090 node scripts/app.js
```

```
$ curl -s http://127.0.0.1:18090/health
{"status":"healthy","service":"dealer-logic-app","timestamp":"2026-09-11T05:25:47.900Z"}
```

The monitor:

```
MONITOR_PORT=18091 WEBHOOK_PORT=18092 node scripts/monitor.js
```

```
$ curl -s http://127.0.0.1:18091/api/metrics
{"calls":{"total":0,"answered":0,"abandoned":0,"transferred":0},"agents":{},"intents":{},"errors":[],"performance":{"avgResponseTime":0,"avgCallDuration":0}}
```

Both servers were stopped after a few seconds. Steps not run: `npm run deploy` (writes processed config and a report to disk; needs a filled `.env`), `npm test`, `npm run test:voice`, `api/server.js`, any Docker build, `fly deploy`, Vercel, Netlify, Codespaces.

## What runs today

- `scripts/validate.js`: checks `.env` values, phone number formats, `config/agents.json`, tool endpoint URLs, business hours, and compliance strings. Writes a report to `reports/`.
- `scripts/deploy.js`: fills the JSON templates in `config/` from `.env` and writes them to `config/processed/<id>/`. Local file work only; it does not call ElevenLabs.
- `scripts/monitor.js`: two plain `http` servers, a dashboard with `/api/metrics` and a webhook listener that counts calls posted to it.
- `scripts/app.js`: Express app with an in-memory SQLite database, JWT login, a dashboard page, `/health`, and `/api/data/github` and `/api/data/reddit` routes that call GitHub and Reddit when tokens are present.
- `api/server.js`, `api/webhooks.js`, `api/conversation-handler.js`: Express routes meant to receive ElevenLabs webhook posts.
- `api/elevenlabs-agent.js`: an axios client that builds an agent definition (system prompt, tools) for the ElevenLabs Conversational agents API.
- `config/agents.json`: nine agents (`agent.reception`, `agent.sales`, `agent.tradein`, `agent.service`, `agent.service_status`, `agent.parts`, `agent.finance`, `agent.recall`, `agent.after_hours`). `config/tools.json` and `config/templates.json` hold the tool schemas and SMS/email text.
- `public/`: three static pages (`index.html`, `demo.html`, `dashboard.html`).

## Roadmap

None committed. The only open item is a Dependabot pull request bumping `tar-fs`.

## Limits

- This is configuration and glue, not a phone system. It needs an ElevenLabs agent, a SIP trunk, a CRM, and hosted tool endpoints that are not in this repository.
- Nothing in the repository shows a live call was ever handled. The "Arizona Pilot" language and the KPI targets in the old docs describe goals, not results.
- `.env.production` and the committed tarball `dealer-logic-deployment-20250905-233209.tar.gz` contain real Phoenix-area phone numbers and dealer-facing URLs. Treat them as public.
- `scripts/app.js` falls back to fixed JWT and session secret strings when the environment does not set them. Do not run it on a public host as is.
- The recording notice, SMS opt-in script, and DNC phrase are text in `config/`. Nothing here checks them against any law or carrier rule.

## License and contact

No license file. `package.json` marks the package `UNLICENSED` (all rights reserved).

Contact: michael@crowelogic.com
