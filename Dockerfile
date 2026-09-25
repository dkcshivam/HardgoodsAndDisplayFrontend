FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]


FROM deps AS build
COPY . .
# Read by the build, not at run time: the API URL is compiled into the
# bundle and the proxy target into the routing rules. Change them, rebuild.
ARG NEXT_PUBLIC_API_URL=/api
ARG API_PROXY_TARGET=http://backend:8000
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    API_PROXY_TARGET=$API_PROXY_TARGET
RUN npm run build


# Runs the standalone bundle Next emits — server.js plus only the
# node_modules it actually reached for.
FROM node:22-alpine AS prod
WORKDIR /app
# server.js listens on $HOSTNAME, which Docker sets to the container id;
# 0.0.0.0 makes it answer on every network the container joins.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
