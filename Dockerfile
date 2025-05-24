FROM node:latest

# 设置工作目录
WORKDIR /app

# 安装 nodemon 用于热更新（仅用于开发）
RUN npm install -g nodemon

# 安装依赖（注意：实际使用时依赖由挂载进来的 volume 提供）
COPY package*.json ./
RUN npm install

# 容器启动命令：使用 nodemon 热更新
CMD ["nodemon", "app.js"]

