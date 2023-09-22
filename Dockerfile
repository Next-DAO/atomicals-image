# base image
FROM node:18-alpine AS base

WORKDIR /app

RUN corepack enable

# build image
FROM base AS build

# RUN set -ex && \
# apk update && apk add --no-cache git && \

COPY ./atomicals-js /app

RUN set -ex && \
    # install dependencies and build
    rm yarn.lock package-lock.json && \
    yarn && yarn build && \
    # remove dev dependencies
    yarn install --production && \
    # check atomicals version
    yarn cli --version

# release image
FROM base AS release

COPY --from=build /app /app

ENTRYPOINT [ "yarn", "cli" ]