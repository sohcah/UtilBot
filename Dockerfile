FROM node:16-alpine3.17

WORKDIR /usr/src/UtilBot

RUN apk add build-base libde265-dev libde265 libheif-dev libheif vips-dev vips

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --build-from-source --verbose

COPY . .

RUN yarn build

CMD [ "node", "lib/index.js" ]

