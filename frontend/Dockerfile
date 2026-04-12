FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev", "--host"]
