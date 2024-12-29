// 可带参数订阅或访问：wokers域名或绑定的域名/sub?CFIP=优选ip或优选域名&CFPORT=优选ip或优选域名对应的端口
// 例如：wokers域名或绑定的域名/sub?CFIP=47.75.222.188&CFPORT=7890

//  请求api自动添加节点订阅或单节点方式
// curl -X POST https://wokers域名或绑定的域名/add-subscription \
//     -H "Content-Type: application/json" \
//     -d '{"sub": "订阅链接"}'

// curl -X POST https://wokers域名或绑定的域名/add-nodes \
//     -H "Content-Type: application/json" \
//     -d '{"nodes": ["vless://","vmess://","tuic://","hy2://"]}'

// Cloudflare API 配置
const CLOUDFLARE_API_TOKEN = '8888';    // 替换为你的 Cloudflare API Token
const CLOUDFLARE_ACCOUNT_ID = '8888';   // 替换为你的 Cloudflare Account ID
const CLOUDFLARE_SCRIPT_NAME = 'sub';   // 替换为创建 Workers 时的名称

// 安全配置
const ALLOWED_IPS = [];         // 允许IP访问，默认开放所有IP,若限制IP,将影响订阅上传功能,若只使用订阅归总功能,可限制IP
const RATE_LIMIT = 3;           // 每分钟最多 3 次请求

// 订阅配置
let CFIP = "www.visa.com.tw";  // 优选 IP 或优选域名
let CFPORT = "443";            // 优选 IP 或域名对应的端口
const SUB_PATH = '/sub';       // 订阅路径,可更换更复杂的请求路径,wokers域名/sub?CFIP=47.75.222.188&CFPORT=7890中的sub

// 订阅链接,添加在双引号内,
let subscriptions = [
  "https://google.com/sub",
  "https://google.com/sub"  // 最后一个没有逗号
];

// 单独节点, 添加在双引号内,
let nodes = [
  "vless://ew0KICAidiI6",
  "vmess://ew0KICAidiI6",
  "trojan://QwwHvrnN@",
  "hysteria2://89c13",
  "tuic://89c13786"  // 最后一个没有逗号
];

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const nodeArray = nodes;
const rateLimitMap = new Map();

// 获取原代码
async function getOriginalCode() {
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_SCRIPT_NAME}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/javascript'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('获取 Workers 脚本失败:', errorData);
      throw new Error(`获取 Workers 脚本失败: ${JSON.stringify(errorData)}`);
    }

    const data = await response.text();
    console.log('获取 Workers 脚本成功');
    return data;
  } catch (error) {
    console.error('获取 Workers 脚本失败:', error);
    throw error;
  }
}

// 更新订阅链接或单节点
function updateCodeWithNewContent(originalCode, { subscription, nodes: newNodes }) {
  console.log('原代码内容:', originalCode);

  // 解析原代码中的 subscriptions 和 nodes
  const subscriptionsMatch = originalCode.match(/let\s+subscriptions\s*=\s*(\[[\s\S]*?\]);/);
  const nodesMatch = originalCode.match(/let\s+nodes\s*=\s*(\[[\s\S]*?\]);/);

  console.log('subscriptionsMatch:', subscriptionsMatch);
  console.log('nodesMatch:', nodesMatch);

  if (!subscriptionsMatch || !nodesMatch) {
    throw new Error('无法解析原代码中的 subscriptions 或 nodes');
  }

  let subscriptions;
  try {
    subscriptions = JSON.parse(subscriptionsMatch[1]);
  } catch (error) {
    console.error('解析 subscriptions 失败:', error);
    throw new Error('解析 subscriptions 失败');
  }

  let nodes;
  try {
    nodes = JSON.parse(nodesMatch[1]);
  } catch (error) {
    console.error('解析 nodes 失败:', error);
    throw new Error('解析 nodes 失败');
  }

  // 更新 subscriptions
  if (subscription) {
    subscriptions.push(subscription);
    originalCode = originalCode.replace(
      /let\s+subscriptions\s*=\s*\[[\s\S]*?\];/,
      `let subscriptions = ${JSON.stringify(subscriptions)};`
    );
  }

  // 更新 nodes
  if (newNodes && Array.isArray(newNodes)) {
    nodes.push(...newNodes);
    originalCode = originalCode.replace(
      /let\s+nodes\s*=\s*\[[\s\S]*?\];/,
      `let nodes = ${JSON.stringify(nodes)};`
    );
  }

  return originalCode;
}

// 更新 Workers 脚本
async function updateWorkersScript(newCode) {
  try {
    console.log('准备更新 Workers 脚本...');
    console.log('新的代码内容:', newCode);

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${CLOUDFLARE_SCRIPT_NAME}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/javascript'
      },
      body: newCode
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('更新 Workers 脚本失败:', errorData);
      throw new Error(`更新 Workers 脚本失败: ${JSON.stringify(errorData)}`);
    }

    console.log('Workers 脚本更新成功');
    return true;
  } catch (error) {
    console.error('更新 Workers 脚本失败:', error);
    throw error;
  }
}

// 处理添加订阅链接的请求
async function addSubscription(subscription) {
  try {
    console.log('准备添加订阅链接:', subscription);

    const originalCode = await getOriginalCode();
    const newCode = updateCodeWithNewContent(originalCode, { subscription });
    await updateWorkersScript(newCode);

    console.log('订阅链接添加成功');
    return true;
  } catch (error) {
    console.error('订阅链接添加失败:', error);
    throw error;
  }
}

// 处理添加单独节点的请求
async function addMultipleNodes(newNodes) {
  try {
    console.log('准备添加节点:', newNodes);

    const originalCode = await getOriginalCode();
    const newCode = updateCodeWithNewContent(originalCode, { nodes: newNodes });
    await updateWorkersScript(newCode);

    console.log('节点添加成功');
    return true;
  } catch (error) {
    console.error('节点添加失败:', error);
    throw error;
  }
}

// 获取订阅内容
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

// 获取订阅链接内容
async function fetchSubscriptionContent(subscription) {
  if (!subscription.startsWith('http://') && !subscription.startsWith('https://')) {
    return null;
  }
  const response = await fetch(subscription);
  return response.ok ? response.text() : null;
}

// 解码 Base64 内容
function decodeBase64Content(base64Content) {
  return atob(base64Content);
}

// 替换地址和端口
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

// 处理请求
async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP'); // 获取客户端 IP

  // 频率限制
  if (!checkRateLimit(clientIP)) {
    return new Response('Too Many Requests', { status: 429 });
  }

  // 处理添加订阅链接的请求
  if (url.pathname === '/add-subscription' && request.method === 'POST') {
    const { sub } = await request.json();
    if (!sub) {
      return new Response('Missing subscription link', { status: 400 });
    }

    await addSubscription(sub);
    return new Response('Subscription added successfully', { status: 200 });
  }

  // 处理添加单独节点的请求
  if (url.pathname === '/add-nodes' && request.method === 'POST') {
    try {
      // 读取请求体
      const payload = await request.text();
      console.log('Received payload:', payload); // 记录接收到的数据

      // 清理 JSON 数据
      const cleanedPayload = cleanJsonString(payload);

      // 解析 JSON
      const { nodes: newNodes } = JSON.parse(cleanedPayload);
      if (!newNodes || !Array.isArray(newNodes)) {
        return new Response('Missing or invalid nodes', { status: 400 });
      }

      // 添加新节点
      await addMultipleNodes(newNodes);

      // 返回成功响应
      return new Response('Nodes added successfully', { status: 200 });
    } catch (error) {
      // 返回错误响应
      console.error('Error processing request:', error);
      return new Response('Invalid JSON data', { status: 400 });
    }
  }

  // 处理订阅请求
  if (url.pathname === SUB_PATH) {
    // 从查询参数中获取 CFIP 和 CFPORT
    const queryCFIP = url.searchParams.get('CFIP');
    const queryCFPORT = url.searchParams.get('CFPORT');

    if (queryCFIP && queryCFPORT) {
      CFIP = queryCFIP;
      CFPORT = queryCFPORT;
      console.log(`CFIP and CFPORT updated to ${CFIP}:${CFPORT}`);
    }

    const mergedSubscription = await generateMergedSubscription();
    const base64Content = btoa(mergedSubscription);
    return new Response(base64Content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // 查询订阅链接
  if (url.pathname === '/list-subscriptions' && request.method === 'GET') {
    return new Response(JSON.stringify(subscriptions), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 默认返回 Hello world!
  return new Response('Hello world!', { status: 200 });
}

// 检查频率限制
function checkRateLimit(clientIP) {
  const currentTime = Math.floor(Date.now() / 1000 / 60); // 按分钟计算

  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, { count: 1, lastMinute: currentTime });
  } else {
    const record = rateLimitMap.get(clientIP);
    if (record.lastMinute === currentTime) {
      record.count++;
      if (record.count > RATE_LIMIT) {
        return false;
      }
    } else {
      record.count = 1;
      record.lastMinute = currentTime;
    }
  }

  return true;
}

function cleanJsonString(jsonString) {
  return jsonString.replace(/[\x00-\x1F\x7F]/g, '');
}
