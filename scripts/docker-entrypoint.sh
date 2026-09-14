#!/bin/sh
# Optional migrations before start — set RUN_MIGRATIONS=true on first deploy only,
# or run `npx prisma migrate deploy` in your release pipeline instead.
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo '{"level":"info","message":"prisma.migrate.deploy.start"}'
  ./node_modules/.bin/prisma migrate deploy
  echo '{"level":"info","message":"prisma.migrate.deploy.done"}'
fi

exec "$@"
