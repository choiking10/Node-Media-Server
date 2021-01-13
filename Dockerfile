FROM node:13.8.0-alpine3.11

RUN apk add --no-cache ffmpeg

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm i

COPY . .

EXPOSE 1935 8000

CMD ["node","app.js"]
