FROM node:20.19-slim

WORKDIR /app

# OpenSSL is required by Prisma at runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files for layer caching
COPY package.json package-lock.json ./

# Copy prisma schema + config before npm install so postinstall (prisma generate) can run
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies (triggers postinstall: prisma generate)
RUN npm install

# Copy remaining source
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "node_modules/next/dist/bin/next", "start"]
