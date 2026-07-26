FROM node:20-bullseye

WORKDIR /app

COPY package.json package-lock.json postinstall.js ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
