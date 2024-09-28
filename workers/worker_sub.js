// 订阅：workers域名/sub  sub路径可定义
// 带参数订阅：workers域名/sub?CFIP=优选ip&CFPORT=优选ip端口
// 例如：https://test.abc.worker.dev/sub?CFIP=47.75.222.188&CFPORT=7890

let CFIP = "www.visa.com.tw";  // 优选ip或优选域名
let CFPORT = "443";            // 优选ip或有序域名对应的端口
const SUB_PATH = '/sub';       // 访问路径

// 添加多个订阅链接，以下示列节点订阅添加前请删除
const subscriptions = [
  'https://www.google/sub',                          
  'https://www.google/sub',
  'https://www.google/sub',  
  'https://www.google/sub'  // 最后一个没有逗号

  // ... 添加更多订阅链接
];

// 支持添加单条或多条自建节点，可以为空,以下示列节点添加前请删除
const nodes = `
vless://9afd1229-b893-40c1-84dd-51e7ce204913@www.visa.com.tw:8443?encryptio  
vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogIkdsaXRjaC1VUy1BbWF6b24uY29tIiwNCiA
trojan://9afd1229-b893-40c1-84dd-51e7ce204913@www.visa.com.tw:8443?security
hysteria2://6991e58f-a9af-4319-a8e8-e9c4df14d650@156.255.90.161:17397/?sni
tuic://6991e58f-a9af-4319-a8e8-e9c4df14d650:YDU08bdN1no66Eufx7XdGbVJ@156.25

`;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const nodeArray = nodes.trim().split('\n').filter(node => node); 

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // 从查询参数中获取 CFIP 和 CFPORT
  const queryCFIP = url.searchParams.get('CFIP');
  const queryCFPORT = url.searchParams.get('CFPORT');

  if (queryCFIP && queryCFPORT) {
      CFIP = queryCFIP;
      CFPORT = queryCFPORT;
      console.log(`CFIP and CFPORT updated to ${CFIP}:${CFPORT}`);
  }

  if (url.pathname === SUB_PATH) {
      const mergedSubscription = await generateMergedSubscription();
      const base64Content = btoa(mergedSubscription);
      return new Response(base64Content, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
  } else if (url.pathname === '/add-subscription' && request.method === 'POST') {
      const newSubscription = await request.json();
      addSubscription(newSubscription.subscription);
      return new Response('Subscription added successfully', { status: 200 });
  } else if (url.pathname === '/add-nodes' && request.method === 'POST') {  
      const newNodes = await request.json();
      addMultipleNodes(newNodes.nodes); 
      return new Response('Nodes added successfully', { status: 200 });
  }

  return new Response('Hello world!', { status: 200 });
}

function addSubscription(subscription) {
  subscriptions.push(subscription);
}

function addMultipleNodes(nodes) {
  subscriptions.push(...nodes); 
}

async function fetchSubscriptionContent(subscription) {
  if (!subscription.startsWith('http://') && !subscription.startsWith('https://')) {
    return null; 
  }
  const response = await fetch(subscription);
  return response.ok ? response.text() : null;
}

function decodeBase64Content(base64Content) {
  return atob(base64Content);
}

function replaceAddressAndPort(content) {
  if (!CFIP || !CFPORT) {
      return content;
  }

  return content.split('\n').map(line => {
      if (line.startsWith('vmess://')) {
          const base64Part = line.substring(8);
          const decodedVmess = decodeBase64Content(base64Part);
          const vmessObj = JSON.parse(decodedVmess);
          vmessObj.add = CFIP;
          vmessObj.port = parseInt(CFPORT, 10);
          const updatedVmess = btoa(JSON.stringify(vmessObj));
          return `vmess://${updatedVmess}`;
      } else if (line.startsWith('vless://') || line.startsWith('trojan://')) {
          return line.replace(/@([\w.-]+):(\d+)/, (match, host) => {
              return `@${CFIP}:${CFPORT}`;
          });
      }
      return line;
  }).join('\n');
}

async function generateMergedSubscription() {
  const nodesContent = nodeArray.join('\n'); 
  const promises = subscriptions.map(async (subscription) => {
      const subscriptionContent = await fetchSubscriptionContent(subscription);
      if (subscriptionContent) {
          const decodedContent = decodeBase64Content(subscriptionContent);
          const updatedContent = replaceAddressAndPort(decodedContent);
          return updatedContent;
      }
      return null;
  });

  const mergedContentArray = await Promise.all(promises);
  mergedContentArray.unshift(nodesContent);
  return mergedContentArray.filter(content => content !== null).join('\n');
}
