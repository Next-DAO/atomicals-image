#!/bin/sh

set -e

cd /app

# check if /wallet.json exists and has content
if [ -s "/wallet.json" ]; then
  echo "use exist wallet"
  cp /wallet.json /app/wallet.json
else
  echo "create new wallet"
  yarn cli wallet-init
  cat /app/wallet.json > /wallet.json
fi

exec "$@"
