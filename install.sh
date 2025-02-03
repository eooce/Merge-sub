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
HOSTNAME=$(hostname)
USERNAME=$(whoami | tr '[:upper:]' '[:lower:]')
[[ "$HOSTNAME" == "s1.ct8.pl" ]] && WORKDIR="${HOME}/domains/${USERNAME}.ct8.pl/public_nodejs" || WORKDIR="${HOME}/domains/${USERNAME}.serv00.net/public_nodejs"

check_website() {
yellow "正在安装中,请稍后..."
CURRENT_SITE=$(devil www list | awk -v username="${USERNAME}" '$1 == username".serv00.net" && $2 == "nodejs" {print $0}')
if [ -n "$CURRENT_SITE" ]; then
    green "检测到已存在${USERNAME}.serv00.net的nodejs站点,无需修改"
else
    EXIST_SITE=$(devil www list | awk -v username="${USERNAME}" '$1 == username".serv00.net" {print $0}')
    if [ -n "$EXIST_SITE" ]; then
        red "不存在${USERNAME}.serv00.net的nodejs站点,正在为你调整..."
        devil www del "${USERNAME}.serv00.net" > /dev/null 2>&1
        devil www add "${USERNAME}.serv00.net" nodejs /usr/local/bin/node18 > /dev/null 2>&1
        green "已删除旧站点并创建新的php站点"
    else
        devil www add "${USERNAME}.serv00.net" nodejs /usr/local/bin/node18 > /dev/null 2>&1
        green "nodejs站点创建完成"
    fi
fi 
}

install_sub() {
check_website
rm -rf "$WORKDIR" && mkdir -p "$WORKDIR" && chmod 777 "$WORKDIR" >/dev/null 2>&1
cd "$WORKDIR" && git clone https://github.com/eooce/Merge-sub.git
mv "$WORKDIR"/Merge-sub/* "$WORKDIR" >/dev/null 2>&1
rm -rf workers Merge-sub Dockerfile README.md install.sh>/dev/null 2>&1
ip_address=$(devil vhost list | sed -n '5p' | awk '{print $1}')
devil ssl www add $ip_address le le keep.${USERNAME}.serv00.net > /dev/null 2>&1
ln -fs /usr/local/bin/node18 ~/bin/node > /dev/null 2>&1
ln -fs /usr/local/bin/npm18 ~/bin/npm > /dev/null 2>&1
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:~/bin:$PATH' >> $HOME/.bash_profile && source $HOME/.bash_profile
rm -rf $HOME/.npmrc > /dev/null 2>&1
npm install -r package.json --silent > /dev/null 2>&1
devil www options ${USERNAME}.serv00.net sslonly on > /dev/null 2>&1
if devil www restart ${USERNAME}.serv00.net 2>&1 | grep -q "succesfully"; then
    green "\n汇聚订阅已部署\n\n用户名：${USERNAME}\n登录密码：${USERNAME}\n管理页面: https://${USERNAME}.serv00.net\n\n"
    yellow "汇聚节点订阅：https://${USERNAME}.serv00.net/sub\n\n自定义优选ip订阅：https://${USERNAME}.serv00.net/sub?CFIP=ip.sb&CFPORT=443  ip.sb和端口可随意更换可用的优选ip或优选域名\n\n"
else
    red "汇聚订阅安装失败\n${yellow}devil www del ${USERNAME}.serv00.net\nrm -rf $HOME/${USERNAME}/domains/*\n${red}请依次执行上述命令后重新安装!"
fi
}  

install_sub
