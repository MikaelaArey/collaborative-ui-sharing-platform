# Builds and runs the server + browser client as a single deployable service (see
# docs/10-deployment.md). The Electron Host app is NOT part of this image — it stays something
# each Host runs locally (see desktop/README.md); this image only needs to serve the client and
# run the signaling/API server.

FROM node:20-slim AS build
WORKDIR /app

# Only the workspace manifests needed to resolve the "server" and "client" workspaces — the
# --workspace flags below mean `desktop`'s dependencies (electron, native nut-js bindings) are
# never installed here, even though its manifest must exist for npm's workspace resolution.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY desktop/package.json desktop/package.json

RUN npm install --workspace=server --workspace=client

COPY client client
COPY server server

RUN npm run build --workspace=client
RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm run build --workspace=server

# ---- Runtime image ----
FROM node:20-slim AS runtime
WORKDIR /app/server
ENV NODE_ENV=production

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server/node_modules /app/server/node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/prisma ./prisma
COPY --from=build /app/client/dist ./public
COPY server/package.json ./package.json

EXPOSE 4000

# Applies any pending Prisma migrations against the mounted volume's SQLite file, then starts the
# server — safe to run on every boot (a no-op when there's nothing new to apply).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
