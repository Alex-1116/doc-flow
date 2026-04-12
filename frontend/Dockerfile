FROM node:20-alpine

# 安装 pnpm 并配置国内镜像源
RUN npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

WORKDIR /app

# 复制 package 文件
COPY package.json ./

# 使用 pnpm 安装依赖（如果没有 lock 文件，会创建一个）
RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev"]
