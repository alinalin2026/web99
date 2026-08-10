# Web99 AWS production shape — first 50 customers

The goal is boring reliability with the fewest moving parts.

## Runtime

- **One AWS Ubuntu server**
- **One Nginx** front door
- **One Next.js dashboard/API process** on `127.0.0.1:3000`
- **One background worker**
- **One PostgreSQL database** used for orders, durable jobs, generated sites and versions
- **OpenAI API** for Sarah, planning, copy, images, build and QA

No Redis. No Vercel in the runtime path. No GitHub in a customer build. No separate per-customer process.

## URLs

- `https://web99.ie/` — static Web99 marketing site
- `https://web99.ie/start/` — Sarah intake
- `https://web99.ie/control` — operator dashboard
- `https://web99.ie/api/*` — Sarah/dashboard public API aliases
- `https://web99.ie/demo/<slug>` — customer preview served from PostgreSQL
- `https://web99.ie/buy/<id>` — checkout

## Source of truth

`/srv/web99/app` is the Git checkout used only to fetch Web99 source updates.

`/srv/web99/releases/<release>` contains immutable built releases.

`/srv/web99/current` is one symlink to the release currently serving traffic.

`/srv/web99/config/dashboard.env` contains runtime secrets and is never committed.

Nginx serves static marketing files from `/srv/web99/current` and proxies only the dynamic Web99 paths to the Next app in that same release. There is no second `/srv/web99/marketing` copy.

## Deployments

`sudo /srv/web99/current/ops/deploy.sh`

The deploy script:

1. takes a deploy lock;
2. fetches the chosen Git branch;
3. creates a fresh release directory;
4. installs exact npm dependencies with `npm ci`;
5. runs typecheck, tests and `next build` before touching live traffic;
6. atomically changes `/srv/web99/current`;
7. restarts app + worker;
8. reloads the tracked Nginx config;
9. runs local and public smoke tests;
10. automatically rolls back the symlink if the new release fails smoke tests;
11. retains only a small number of old releases.

A failed build therefore does not delete the currently running release.

## Background work

The browser only queues work in PostgreSQL. The worker claims one job at a time with `FOR UPDATE SKIP LOCKED`.

If the worker/server is restarted while a job is running, the new worker automatically requeues interrupted work. A customer build therefore does not depend on keeping a browser open.

One worker is intentional for the first phase: it is easier to reason about, avoids accidental duplicate OpenAI/image spend, and queues bursts safely. Add a second worker only when real volume requires it.

## Health

Public machine health:

`https://web99.ie/api/health`

It checks the app, PostgreSQL and queue counts without exposing secrets.

Server diagnosis:

`sudo /srv/web99/current/ops/doctor.sh`

## Backups

A systemd timer runs a PostgreSQL dump every night and retains 14 days locally. Before meaningful customer volume, add an AWS EBS snapshot or S3 copy so backups also survive loss of the EC2 instance.

## Capacity target

This shape is intentionally sized for the first ~50 customers, not internet-scale traffic. Generated images are currently stored in PostgreSQL as part of the project data. That is acceptable for this first phase and avoids adding object storage before actual volume requires it.
