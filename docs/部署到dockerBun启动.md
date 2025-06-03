## 已使用Bun替代Node.js(废弃，重返Node.js, Bun网络性能过差)
1. docker pull oven/bun
2. docker run --rm --init --ulimit memlock=-1:-1 oven/bun
3. cd进入项目根目录
4. 编写Dockerfile文件:
```bash
FROM oven/bun:latest

# 设置工作目录
WORKDIR /app
# 安装依赖（注意：实际使用时依赖由挂载进来的 volume 提供）
COPY package*.json ./
RUN bun install
# 容器启动命令：使用 bun 的内置热更新
CMD ["bun", "--watch", "server.mjs"]
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
