#!/bin/sh
set -e
if [ "$NODE_ENV" = "production" ]; then
  node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
  node dist/database/seeds/exam-types.seed.js
  node dist/database/seeds/subjects.seed.js
fi
exec node dist/main.js
