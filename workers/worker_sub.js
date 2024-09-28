// 订阅：workers域名/sub  sub路径可自定义
// 可带参数：workers域名/sub?CFIP=优选ip&CFPORT=优选ip端口
// 例如：https://test.abc.workers.dev/sub?CFIP=47.75.222.188&CFPORT=7890

let CFIP = "www.visa.com.tw";  // 优选ip或优选域名
let CFPORT = "443";            // 优选ip或有序域名对应的端口
const SUB_PATH = '/sub';       // 访问路径

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const subscriptions = [
  'https://www.google.com/sub',                          
  'https://www.google.com/sub',
  'https://www.google.com/sub'
  // ... 添加更多子订阅链接
];

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
  }

  return new Response('Hello world!', { status: 200 });
}

function addSubscription(subscription) {
  subscriptions.push(subscription);
}

async function fetchSubscriptionContent(subscription) {
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
          // 使用正则表达式匹配并替换 host 和 port
          return line.replace(/@([\w.-]+):(\d+)/, (match, host) => {
              return `@${CFIP}:${CFPORT}`;
          });
      }

      return line;
  }).join('\n');
}

async function generateMergedSubscription() {
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
  return mergedContentArray.filter(content => content !== null).join('\n');
}
