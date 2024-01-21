
// 部署完成后在网址后面加上这个，获取自建节点和订阅链接节点，域名/?token=merge&tag=sub
// 部署完成后在网址后面加上这个，只获取自建节点，域名/?token=merge-sub

const mytoken = 'merge';          //可以随便取,不能为空
const tgbottoken ='';            //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
const tgchatid ='';             //可以为空，或者@userinfobot中获取，/start

//自建节点，可以为空
const MainData = `
vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogIkFjdGl2bm9kZXMtTkwtQWR2aW5fU2VydmljZXMiLA0KICAiYWRkIjogInNray5tb2UiLA0KICAicG9ydCI6IC

`

//订阅链接，可多个，也可为0
const urls = [

  'https://www.google.com/sub',           // 备注名称
  'hhttps://www.google.com/sub',         // 备注名称
  'https://www.google.com/sub',         // 备注名称
  'https://www.google.com/sub'         // 备注名称
  // 添加更多子订阅链接，最后一个后面不带逗号
];

addEventListener('fetch', event => { event.respondWith(handleRequest(event.request)) })


async function handleRequest(request) {
    const url = new URL(request.url);
    const tag = url.searchParams.get('tag');
    const token = url.searchParams.get('token'); // Get the token from the URL

    if (token !== mytoken) {
      //await sendMessage("#Token错误信息", request.headers.get('CF-Connecting-IP'), `Invalid Token: ${token}`);
      return new Response('Invalid token???', { status: 403 });
    }
  
    let req_data = "";
    req_data += MainData
    if (tag) {
        switch (tag) {
          case 'sub':
            const responses = await Promise.all(urls.map(url => fetch(url)));
    
            for (const response of responses) {
              if (response.ok) {
                const content = await response.text();
                req_data += atob(content) + '\n';
              }
            }
            
            break;
    
          default:
            
            break;
      }
    } 
  
    await sendMessage("#访问信息", request.headers.get('CF-Connecting-IP'), `Tag: ${tag}`);
    //修复中文错误
    const utf8Encoder = new TextEncoder();
    const encodedData = utf8Encoder.encode(req_data);
    const base64Data = btoa(String.fromCharCode.apply(null, encodedData));
    return new Response(base64Data);
  }
  

async function sendMessage(type, ip, add_data = "") {
  const OPT = {
    BotToken: tgbottoken, // Telegram Bot API
    ChatID: tgchatid, // User 或者 ChatID，电报用户名
  }

  let msg = "";

  const response = await fetch(`http://ip-api.com/json/${ip}`);
  if (response.status == 200) { // 查询 IP 来源信息，使用方法参考：https://ip-api.com/docs/api:json
    const ipInfo = await response.json();
    msg = `${type}\nIP: ${ip}\nCountry: ${ipInfo.country}\nCity: ${ipInfo.city}\n${add_data}`;
  } else {
    msg = `${type}\nIP: ${ip}\n${add_data}`;
  }

  let url = "https://api.telegram.org/";
  url += "bot" + OPT.BotToken + "/sendMessage?";
  url += "chat_id=" + OPT.ChatID + "&";
  url += "text=" + encodeURIComponent(msg);

  return fetch(url, {
    method: 'get',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
    }
  });
}
