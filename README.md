# DevRPG Brain

> The AI that remembers your projects, restores your coding context, and turns progress into a game.

## Prerequisites

- Node.js 20+
- npm 10+

## Getting Started

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start both desktop app and API |
| `npm run dev:api` | Start API server only (port 3001) |
| `npm run dev:desktop` | Start desktop app only |
| `npm run build` | Build all packages for production |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all packages |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio (DB browser) |

## Architecture

See [CLAUDE.md](CLAUDE.md) for detailed architecture and module documentation.
