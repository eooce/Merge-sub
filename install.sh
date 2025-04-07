
#!/bin/bash
export LC_ALL=C
re="\033[0m"
red="\033[1;91m"
green="\e[1;32m"
yellow="\e[1;33m"
purple="\e[1;35m"
red() { echo -e "\e[1;91m$1\033[0m"; }
green() { echo -e "\e[1;32m$1\033[0m"; }
yellow() { echo -e "\e[1;33m$1\033[0m"; }
USERNAME=$(whoami | tr '[:upper:]' '[:lower:]')
HOSTNAME=$(hostname)

if [[ "$HOSTNAME" =~ ct8 ]]; then
    CURRENT_DOMAIN="${USERNAME}.ct8.pl"
elif [[ "$HOSTNAME" =~ useruno ]]; then
    CURRENT_DOMAIN="${USERNAME}.useruno.com"
else
    CURRENT_DOMAIN="${USERNAME}.serv00.net"
fi

check_website() {
yellow "正在安装中,请稍等..."
CURRENT_SITE=$(devil www list | awk -v domain="${CURRENT_DOMAIN}" '$1 == domain && $2 == "nodejs"')
if [ -n "$CURRENT_SITE" ]; then
    green "已存在 ${CURRENT_DOMAIN} 的node站点,无需修改"
else
    EXIST_SITE=$(devil www list | awk -v domain="${CURRENT_DOMAIN}" '$1 == domain')
    
    if [ -n "$EXIST_SITE" ]; then
        devil www del "${CURRENT_DOMAIN}" >/dev/null 2>&1
        devil www add "${CURRENT_DOMAIN}" nodejs /usr/local/bin/node18 > /dev/null 2>&1
        green "已删除旧的站点并创建新的nodejs站点"
    else
        devil www add "${CURRENT_DOMAIN}" nodejs /usr/local/bin/node18 > /dev/null 2>&1
        green "已创建 ${CURRENT_DOMAIN} nodejs站点"
    fi
fi
}

install_sub() {
check_website
WORKDIR="${HOME}/domains/${CURRENT_DOMAIN}/public_nodejs"
rm -rf "$WORKDIR"  && mkdir -p "$WORKDIR" && chmod 777 "$WORKDIR" >/dev/null 2>&1
cd "$WORKDIR" && git clone https://github.com/eooce/Merge-sub.git >/dev/null 2>&1
green "项目克隆成功,正在配置..."
mv "$WORKDIR"/Merge-sub/* "$WORKDIR" >/dev/null 2>&1
rm -rf workers Merge-sub Dockerfile README.md install.sh>/dev/null 2>&1
ip_address=$(devil vhost list | awk '$2 ~ /web/ {print $1}')
devil ssl www add $ip_address le le ${CURRENT_DOMAIN} > /dev/null 2>&1
ln -fs /usr/local/bin/node18 ~/bin/node > /dev/null 2>&1
ln -fs /usr/local/bin/npm18 ~/bin/npm > /dev/null 2>&1
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:~/bin:$PATH' >> $HOME/.bash_profile && source $HOME/.bash_profile
rm -rf $HOME/.npmrc > /dev/null 2>&1
npm install -r package.json --silent > /dev/null 2>&1
devil www options ${CURRENT_DOMAIN} sslonly on > /dev/null 2>&1
if devil www restart ${CURRENT_DOMAIN} 2>&1 | grep -q "Ok"; then
    green "\n汇聚订阅已部署\n\n用户名：admin \n登录密码：admin  请及时修改\n管理页面: https://${CURRENT_DOMAIN}\n\n"
    yellow "汇聚节点订阅登录管理页面查看\n\n"
else
    red "汇聚订阅安装失败\n${yellow}devil www del ${CURRENT_DOMAIN} \nrm -rf $HOME/domains/*\n${red}请依次执行上述命令后重新安装!"
fi
}  

install_sub
