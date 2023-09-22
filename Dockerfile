# base image
FROM node:18 AS base

WORKDIR /app

RUN corepack enable

# build image
FROM base AS build

COPY ./atomicals-js /app

RUN set -ex && \
    # rm yarn.lock package-lock.json && \
    # install dependencies and build
    yarn && yarn build && \
    # remove dev dependencies
    # yarn install --production && \
    # check atomicals version
    yarn cli --version

# release image
FROM base AS release

COPY --from=build /app /app
COPY ./wallet-init.sh /app/

ARG WALLET=""

RUN ./wallet-init.sh

ENTRYPOINT [ "yarn", "cli" ]
