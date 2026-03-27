FROM node:20.19-slim

WORKDIR /app

# OpenSSL (Prisma) + Chrome Headless Shell system library dependencies
# node:20.19-slim is Debian Bookworm — libasound2t64 is the Bookworm name for libasound2
RUN apt-get update -y && apt-get install -y \
  openssl \
  libnspr4 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libx11-6 \
  libxcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libxkbcommon0 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libglib2.0-0 \
  libasound2t64 \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install

# Pre-download Chrome Headless Shell during image build so it's baked in.
# Avoids an 87MB download on the first render request in production,
# and eliminates runtime download failures (network errors, slow starts).
# The binary lands in node_modules/.remotion/ which persists in the image.
RUN node_modules/.bin/remotion browser ensure

COPY . .

# Declare build args so Railway passes NEXT_PUBLIC vars into the Docker build.
# Next.js bakes these into the client bundle at build time — they must be present here.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "node_modules/next/dist/bin/next", "start"]
