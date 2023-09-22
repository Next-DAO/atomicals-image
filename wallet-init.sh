#!/bin/bash

if [ -z "${WALLET}" ]; then
    echo ""
    echo "WALLET not set"
    echo ""
    exit 1
fi

if [ "${WALLET}" == "advanced" ]; then
    echo SKIP WALLET INIT
    exit 0
fi

echo "INIT WALLET ${WALLET}"
echo ""

yarn cli wallet-init

echo "COPY THIS WALLET JSON TO A SAFE PLACE"
echo ""

cat wallet.json

echo ""
echo ""
echo "COPY THIS WALLET JSON TO A SAFE PLACE"
echo ""
