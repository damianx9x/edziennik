FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS builder

ARG APP_DOMAIN=staging.kingslanguageacademy.pl

ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_SECRET=build-only-not-used-at-runtime-00000000000000000000
ENV BETTER_AUTH_URL=https://${APP_DOMAIN}
ENV NEXT_PUBLIC_APP_URL=https://${APP_DOMAIN}
ENV KLA_PRIVATE_FILES_DIR=/app/.data/private-files

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV APP_HOST=0.0.0.0
ENV APP_PORT=3000

WORKDIR /app

RUN groupadd --system --gid 1001 kla \
  && useradd --system --uid 1001 --gid kla --home-dir /app kla

COPY --from=builder --chown=kla:kla /app/.next/standalone ./
COPY --from=builder --chown=kla:kla /app/.next/static ./.next/static
COPY --from=builder --chown=kla:kla /app/public ./public
COPY --from=builder --chown=kla:kla /app/prisma ./prisma
COPY --from=builder --chown=kla:kla /app/prisma.config.ts ./prisma.config.ts

COPY --chown=kla:kla scripts/release-prisma.config.ts ./migration-tools/prisma.config.ts
COPY --chown=kla:kla scripts/setup-system-owner.mjs ./migration-tools/setup-owner.mjs
COPY --chown=kla:kla scripts/seed-server-demo.mjs ./migration-tools/seed-demo.mjs
COPY --chown=kla:kla scripts/apply-director-mfa-policy.mjs ./migration-tools/apply-director-mfa-policy.mjs
COPY --chown=kla:kla deployment/home-vps/migration-tools-package.json ./migration-tools/package.json
RUN npm install \
    --prefix ./migration-tools \
    --omit=dev \
    --no-audit \
    --no-fund \
    --package-lock=false

COPY --chown=kla:kla scripts/release-start.sh ./start.sh
COPY --chown=kla:kla scripts/release-migrate.sh ./migrate.sh
COPY --chown=kla:kla scripts/release-setup-owner.sh ./setup-owner.sh
COPY --chown=kla:kla scripts/release-seed-demo.sh ./seed-demo.sh
COPY --chown=kla:kla scripts/release-apply-director-mfa-policy.sh ./apply-director-mfa-policy.sh

RUN mkdir -p /app/.data/private-files \
  && chown -R kla:kla /app \
  && chmod +x /app/start.sh /app/migrate.sh /app/setup-owner.sh /app/seed-demo.sh /app/apply-director-mfa-policy.sh

USER kla

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/panel/logowanie').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["./start.sh"]
