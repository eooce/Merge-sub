FROM node:lts-alpine

WORKDIR /app

COPY . .

EXPOSE 7860

RUN apk update && apk add --no-cache openssl curl wget &&\
    chmod +x index.js &&\
    npm install

CMD ["node", "app.js"]
