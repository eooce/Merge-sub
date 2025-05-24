# Merge-sub
将多个子订阅链接和单节点合并成一个订阅链接，可自定义优选域名或优选ip
* 在线体验地址：https://merge.serv00.net   用户名和密码均为admin 演示站不要尝试改密码，已禁用

* 默认订阅：http://ip:端口/随机token 或 https://你的用户名.serv00.net/随机token
* 带优选ip订阅：http://ip:端口/随机token?CFIP=优选ip&CFPORT=优选ip端口
* 例如：http://192.168.1.1:10000/sub?CFIP=47.75.222.188&CFPORT=7890
* 默认用户名和密码都为admin，请及时更改

## 1: Serv00|ct8|hostuno一键部署命令
* 默认用户名和密码都为admin，请及时更改
```bash
bash <(curl -Ls https://raw.githubusercontent.com/eooce/Merge-sub/main/install.sh)
```

## 2: vps一键部署，
* 需nodejs环境
```bash
apt update -y
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && install nodejs
apt get-install git screen -y
git clone https://github.com/eooce/Merge-sub.git
cd Merge-sub && rm -rf workers Dockerfile README.md install.sh
npm install
screen npm start 
```

## 3: Docker镜像一键部署,容器平台等

环境变量(可选)：`PORT`  `USERNAME`  `PASSWORD`  `SUB_TOKEN`

```
ghcr.io/eooce/merge-sub:latest
```

docker-compose.yaml
```bash
version: '3'

services:
  merge-sub:
    image: ghcr.io/eooce/merge-sub:latest
    ports:
      - "3000:3000"
    volumes:
      - merge-sub-data:/app/data
    environment:
      - DATA_DIR=/app/data
      - PORT=3000
      - USERNAME=admin    # 管理账号
      - PASSWORD=admin    # 管理密码
    restart: unless-stopped

volumes:
  merge-sub-data:
```


# 免责声明
* 本程序仅供学习了解, 非盈利目的，请于下载后 24 小时内删除, 不得用作任何商业用途, 文字、数据及图片均有所属版权, 如转载须注明来源。
* 使用本程序必循遵守部署免责声明，使用本程序必循遵守部署服务器所在地、所在国家和用户所在国家的法律法规, 程序作者不对使用者任何不当行为负责。
