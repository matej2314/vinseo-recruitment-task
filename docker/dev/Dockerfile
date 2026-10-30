# Dev-only base image for bind-mounted monorepo (not production).
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

WORKDIR /app

# Source and node_modules come from compose volumes at runtime.
CMD ["bash"]
