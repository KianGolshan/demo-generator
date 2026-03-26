FROM node:20.19-slim

WORKDIR /app

# OpenSSL is required by Prisma at runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# npm install (not ci) regenerates lockfile for this exact Node version
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "node_modules/next/dist/bin/next", "start"]
