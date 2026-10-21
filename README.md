# OneToDone Image Compressor

Upload JPEG or PNG images and download smaller versions. A background worker compresses each image with `sharp`, and the browser shows the result in real time with a before/after comparison, the size saved and a download link. Anonymous users get a small daily quota; signing in with Google raises it.

## Stack

- **Web:** Next.js (App Router, static export) and Tailwind CSS on Firebase Hosting
- **API and worker:** NestJS on Google Cloud Run, one image with two entrypoints
- **Data and auth:** Firestore and Firebase Auth
- **Storage and delivery:** Cloudflare R2 for files, Cloudinary for previews
- **Background jobs:** Google Cloud Tasks

## Requirements

- Node.js 24
- pnpm 12 (version pinned in `package.json`)
- Java 21 for the Firebase emulators (the Firebase CLI is a dev dependency)

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm emulators   # in a separate terminal
pnpm dev
```

Locally the API uses the Firebase Auth and Firestore emulators (UI on http://127.0.0.1:4000). Every route except `GET /health` requires a Firebase ID token in `Authorization: Bearer <token>`.

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode (API on port 3001, worker on 3002) |
| `pnpm start` | Start the built API and worker |
| `pnpm emulators` | Start the Firebase Auth (9099) and Firestore (8080) emulators |
| `pnpm build` | Build every workspace |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm lint` / `pnpm lint:check` | Lint and fix / lint only |
| `pnpm format` / `pnpm format:check` | Format / check formatting |
| `pnpm test` | Run unit and integration tests |
| `pnpm test:unit` | Run unit tests only |
| `pnpm test:integration` | Run integration tests against their own emulator instance (ports 9199 and 8180) |

## Docker

`apps/api/Dockerfile` builds one image for both services. It starts the API by default; the worker runs with `node dist/main.worker.js`.

```bash
docker compose up --build
```

Compose also starts the Firebase Auth and Firestore emulators (ports 9099 and 8080), so the stack runs without a Google Cloud project.

## Repository layout

```
apps/
  web/        Next.js app
  api/        NestJS API and worker
packages/
  shared/     zod schemas, job status and quota limits shared by web and api
infra/        Firebase config, Firestore rules and indexes, deployment scripts
```

## License

MIT
