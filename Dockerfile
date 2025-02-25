FROM node:lts-alpine

WORKDIR /app

COPY . .

EXPOSE 3000

RUN apk update && apk add --no-cache openssl curl wget &&\
    rm -rf workers install.sh &&\
    chmod +x app.js &&\
    npm install

CMD ["node", "app.js"]
