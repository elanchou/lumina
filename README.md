# Lumina

Personal finance platform (app name: Nexus Finance) with a liquid-glass UI, simulated market data, portfolio management and AI financial analysis powered by Gemini.

## Features

- Dashboard, market and portfolio views
- AI analysis and chat interface backed by Gemini
- Express server (`server.ts`) serving the API and the Vite app

## Tech stack

React 19, Vite, Express 5, Recharts, TypeScript, `@google/genai`

## Getting started

**Prerequisites:** Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # set GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API key used for AI features |

## Project structure

```text
components/   Dashboard, Market, Analysis, ChatInterface, GlassCard, Sparkline, Modal
services/     geminiService.ts
tests/        dashboardData.test.ts
docs/plans/  design notes
server.ts
```

## Testing

```bash
npm test
```
