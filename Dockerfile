FROM oven/bun:latest

# 设置工作目录
WORKDIR /app

# 安装依赖（注意：实际使用时依赖由挂载进来的 volume 提供）
COPY package*.json ./
RUN bun install

# 容器启动命令：使用 bun 的内置热更新
CMD ["bun", "server.mjs"]