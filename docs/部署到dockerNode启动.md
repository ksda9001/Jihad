1. docker pull node
2. cd进入项目根目录
3. 编写Dockerfile文件:
```bash
FROM node:latest

# 设置工作目录
WORKDIR /app
# 安装 nodemon 用于热更新（仅用于开发）
RUN npm install -g nodemon
# 安装依赖（注意：实际使用时依赖由挂载进来的 volume 提供）
COPY package*.json ./
RUN npm install
# 容器启动命令：使用 nodemon 热更新
CMD ["nodemon", "server.mjs"]
```
4. 执行Dockerfile
```bash
# docker build -t 镜像名 .
docker build -t jihad-dev .
```
5. 运行容器
```bash
docker run -it -d --name jihad-dev -v /home/Jihad/Jihad-dev:/app -p 8890:8899 jihad-dev
```
