# base image
FROM node:18 AS base

WORKDIR /app

RUN corepack enable

# build image
FROM base AS build

COPY ./atomicals-js/package.json ./atomicals-js/yarn.lock /app/

RUN set -ex && yarn

COPY ./atomicals-js /app

RUN set -ex && \
    yarn build && \
    # remove dev dependencies
    # yarn install --production && \
    # check atomicals version
    yarn cli --version

# release image
FROM base AS release

COPY --from=build /app /app
COPY ./entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
