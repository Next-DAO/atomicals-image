# base image
FROM node:18-alpine AS base

RUN corepack enable yarn

# build image
FROM base AS build

ARG VERSION=master

RUN set -ex && \
    wget https://github.com/atomicals/atomicals-js/archive/${VERSION}.zip -O /tmp/atomicals-js.zip && \
    cd /tmp && unzip atomicals-js.zip && \
    mv /tmp/atomicals-js-${VERSION} /app

WORKDIR /app

ENV YARN_CACHE_FOLDER=/root/.yarn

RUN --mount=type=cache,target=/root/.yarn rm package-lock.json && \
    yarn && yarn build && \
    # remove dev dependencies
    yarn install --production && \
    # check atomicals version
    yarn cli --version

# release image
FROM base AS release

COPY --from=build /app /app
COPY ./entrypoint.sh /entrypoint.sh

WORKDIR /app

ENTRYPOINT ["/entrypoint.sh"]
