# Browser Agent Service

Standalone Node.js browser agent service for autonomous procurement scraping using Playwright and OpenAI GPT-4o-mini vision.

## Features

- **Autonomous Navigation**: Uses AI vision to understand and navigate procurement portals
- **Playwright Integration**: Full browser automation with headless Chrome
- **OpenAI Vision**: GPT-4o-mini for page analysis and data extraction
- **State Management**: Tracks visited pages, actions, and progress
- **Error Recovery**: Automatic retry and recovery strategies
- **REST API**: HTTP endpoints for job management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

3. Configure environment variables (see `.env.example`)

4. Build:
```bash
npm run build
```

5. Start:
```bash
npm start
```

## Development

```bash
npm run dev
```

## Docker

```bash
docker-compose up
```

## API Endpoints

- `POST /api/scrape` - Start a scraping job
- `GET /api/status/:jobId` - Get job status
- `GET /api/health` - Health check
- `POST /api/cancel/:jobId` - Cancel a job

## Environment Variables

See `.env.example` for all required variables.

## Architecture

See `docs/scrapercard.md` for full system architecture and implementation details.

