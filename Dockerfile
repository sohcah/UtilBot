FROM node:16

WORKDIR /usr/src/UtilBot

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --prod

COPY . .

CMD [ "node", "lib/index.js" ]

