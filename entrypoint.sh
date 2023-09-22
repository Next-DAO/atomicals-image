#!/bin/bash

set -e

cd /app

# check if /wallet.json exists and has content
if [ -s "/wallet.json" ]; then
    cp /wallet.json /app/wallet.json
else
  yarn cli wallet-init
  cp /app/wallet.json /wallet.json
fi

exec "$@"
