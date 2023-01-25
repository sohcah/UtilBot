FROM node:16

WORKDIR /usr/src/UtilBot

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

CMD [ "node", "lib/index.js" ]

