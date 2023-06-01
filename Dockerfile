FROM node:20-alpine

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml .
RUN pnpm install

COPY . .

CMD ["pnpm", "bot"]