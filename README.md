# Merge-sub

这是一个用于合并和管理代理订阅的 Node.js 应用程序。它可以将多个订阅源合并为一个，并支持通过 URL 参数动态替换节点Cloudflare优选域名或IP和。

演示地址：<a href="https://merge.zabc.net" target="_blank">https://merge.zabc.net</a>

## 功能特点

-   **订阅合并**：支持合并多个 VMess、VLESS、Trojan Hysteria2、Anytls、ss等所有协议的订阅链接。
-   **节点管理**：支持手动添加自定义节点,支持api自动添加单节点或订阅。
-   **动态替换**：通过 URL 参数 `?CFIP=...&CFPORT=...` 动态替换节点的地址和端口，不修改原始配置。
-   **Web 管理界面**：提供简单的 Web 界面用于管理订阅和节点。
-   **Docker 支持**：提供 Docker 镜像，方便快速部署。

## 环境变量

| 变量名 | 描述 | 默认值 |
| :--- | :--- | :--- |
| `USERNAME` | Web 管理界面用户名 | `admin` |
| `PASSWORD` | Web 管理界面密码 | `admin` |
| `API_URL` | 外部订阅转换 API 地址 | `https://sublink.eooce.com` |
| `SERVER_PORT` 或 `PORT` | 服务端口 | `3000` |
| `SUB_TOKEN` | 订阅路径的 Token，建议设置复杂的字符串。如果不设置，程序会根据主机名和用户名自动生成。 | `自动生成` |
| `DATA_DIR` | 数据存储目录 | `./data` |

## 部署教程

### 方式一：Docker 部署 (推荐)

使用 Docker 运行最简单。你需要先安装 Docker或Docker环境的容器

docker镜像地址：`eooce/merge-sub`

**运行命令：**

```bash
docker run -d \
  --name merge-sub \
  -p 3000:3000 \
  -e USERNAME=admin \
  -e PASSWORD=admin \
  -v $(pwd)/data:/app/data \
  eooce/merge-sub:latest
```

### 方式二：Docker Compose 部署

如果你喜欢使用 `docker-compose`，可以创建一个 `docker-compose.yml` 文件：

```yaml
version: '3'
services:
  merge-sub:
    image: eooce/merge-sub:latest
    container_name: merge-sub
    restart: always
    ports:
      - "3000:3000"
    environment:
      - USERNAME=admin
      - PASSWORD=admin
      - SUB_TOKEN=my_secret_token
    volumes:
      - ./data:/app/data
```

然后运行：

```bash
docker-compose up -d
```

### 方式三：Node.js 本地部署

1.  **克隆项目或下载源码**
    ```bash
    git clone https://github.com/eooce/merge-sub.git
    ```
2.  **安装依赖**
    ```bash
    cd merge-sub
    npm install
    ```
3.  **启动服务**
    ```bash
    node app.js
    ```
    或者使用 pm2：
    ```bash
    pm2 start app.js --name merge-sub
    ```

## 使用指南

### 1. 访问管理界面

部署成功后，访问 `http://你的IP:3000` 进入管理界面。输入你设置的 `USERNAME` 和 `PASSWORD` 进行登录。
在界面中，你可以添加订阅链接或手动添加节点。

### 2. 获取订阅链接

你的基础订阅链接格式为：
`http://你的IP:3000/你的TOKEN`

如果未设置 `SUB_TOKEN`，可以在启动日志中查看生成的 Token，或者在web管理界面查看。

### 3. 使用 Cloudflare 优选 域名或IP (动态替换)

这是本项目的一个核心功能。你可以在订阅链接后添加 `CFIP` 和 `CFPORT` 参数，来动态替换节点中的地址和端口。

**用法格式：**
`http://你的IP:3000/你的TOKEN?CFIP=优选IP地址&CFPORT=优选端口`

**示例：**
假设你的优选 IP 是 `1.1.1.1`，端口是 `8443`，Token 是 `abc12345`。
你的订阅地址就是：
`http://你的IP:3000/abc12345?CFIP=1.1.1.1&CFPORT=8443`

将这个链接导入到你的代理软件（如 V2RayN(G), Karing, Nekoray, Shadowrocket 等）中即可。


## API 接口

本项目提供了 RESTful API 接口，用于程序化地管理订阅和节点。

### API 列表

#### 1. 添加订阅
- **接口**: `POST /api/add-subscriptions`
- **描述**: 添加一个或多个订阅链接
- **请求体**:
  ```json
  {
    "subscription": "https://example.com/sub1\nhttps://example.com/sub2"
  }
  ```
  或
  ```json
  {
    "subscription": ["https://example.com/sub1", "https://example.com/sub2"]
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "added": ["https://example.com/sub1"],
    "existing": ["https://example.com/sub2"]
  }
  ```

#### 2. 添加节点
- **接口**: `POST /api/add-nodes`
- **描述**: 添加一个或多个节点
- **请求体**:
  ```json
  {
    "nodes": "vmess://xxx\nvless://xxx"
  }
  ```
  或
  ```json
  {
    "nodes": ["vmess://xxx", "vless://xxx"]
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "added": ["vmess://xxx"],
    "existing": ["vless://xxx"]
  }
  ```

#### 3. 删除订阅
- **接口**: `DELETE /api/delete-subscriptions`
- **描述**: 删除一个或多个订阅链接
- **请求体**:
  ```json
  {
    "subscription": "https://example.com/sub1\nhttps://example.com/sub2"
  }
  ```
  或
  ```json
  {
    "subscription": ["https://example.com/sub1", "https://example.com/sub2"]
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "deleted": ["https://example.com/sub1"],
    "notFound": ["https://example.com/sub2"]
  }
  ```

#### 4. 删除节点
- **接口**: `DELETE /api/delete-nodes`
- **描述**: 删除一个或多个节点
- **请求体**:
  ```json
  {
    "nodes": "vmess://xxx\nvless://xxx"
  }
  ```
  或
  ```json
  {
    "nodes": ["vmess://xxx", "vless://xxx"]
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "deleted": ["vmess://xxx"],
    "notFound": ["vless://xxx"]
  }
  ```


### 注意事项
- Docker 部署时，请挂载数据目录，否则每次重启后都会丢失数据。
- 默认的订阅转换地址为：https://sublink.eooce.com，你可以在启动时通过设置环境变量 API_URL 来修改它。
- 默认的订阅路径的Token为：根据主机名和用户名自动生成，你可以在启动时通过设置环境变量 SUB_TOKEN 来修改它。
- 如果不使用 Docker，请确保服务器已安装 Node.js 环境。

## 开源协议

本项目采用 MIT 协议开源，允许自由使用、修改和分发。
