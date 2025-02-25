const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const crypto = require('crypto');
const basicAuth = require('basic-auth');
const { execSync } = require('child_process');

const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const SUB_TOKEN = process.env.SUB_TOKEN || generateRandomString();
let CFIP = process.env.CFIP || "www.visa.com.tw";
let CFPORT = process.env.CFPORT || "443";

const DATA_FILE = path.join(__dirname, 'data.json');
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');

// 添加全局变量声明
let subscriptions = [];
let nodes = '';

// 初始数据
const initialData = {
    subscriptions: [],
    nodes: ''
};

// 初始化凭证变量
let credentials = {
    username: 'admin',
    password: 'admin'
};

// 身份验证中间件
const auth = async (req, res, next) => {
    const user = basicAuth(req);
    if (!user || user.name !== credentials.username || user.pass !== credentials.password) {
        res.set('WWW-Authenticate', 'Basic realm="Node"');
        return res.status(401).send('认证失败');
    }
    next();
};

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 获取 SUB_TOKEN 的路由
app.get('/get-sub-token', auth, (req, res) => {
    res.json({ token: SUB_TOKEN });
});

// 根据用户名生成随机24位字符,并保持重启不变
function generateRandomString() {
    const username = getSystemUsername();
    const hash = crypto.createHash('md5').update(username).digest('hex');
    return hash.slice(0, 24); 
}

// 获取系统用户名
function getSystemUsername() {
    try {
        return execSync('whoami').toString().trim().toLowerCase();
    } catch (error) {
        console.error('Error getting system username:', error);
        return 'admin';
    }
}

// 初始化凭证文件
async function initializeCredentialsFile() {
    try {
        // 检查文件是否存在
        try {
            await fs.access(CREDENTIALS_FILE);
            console.log('Credentials file already exists');
            return true;
        } catch {
            // 文件不存在，创建新文件
            const username = getSystemUsername();
            const initialCredentials = {
                username: username,
                password: username
            };
            
            await fs.writeFile(
                CREDENTIALS_FILE,
                JSON.stringify(initialCredentials, null, 2),
                'utf8'
            );
            console.log('Created new credentials file with system username');
            return true;
        }
    } catch (error) {
        console.error('Error initializing credentials file:', error);
        return false;
    }
}

// 加载凭证
async function loadCredentials() {
    try {
        await initializeCredentialsFile();
        
        const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading credentials:', error);
        const username = getSystemUsername();
        return {
            username: username,
            password: username
        };
    }
}

// 保存凭证
async function saveCredentials(newCredentials) {
    try {
        await fs.writeFile(
            CREDENTIALS_FILE,
            JSON.stringify(newCredentials, null, 2),
            'utf8'
        );
        return true;
    } catch (error) {
        console.error('Error saving credentials:', error);
        return false;
    }
}


// 凭证更新路由
app.post('/admin/update-credentials', auth, async (req, res) => {
    try {
        console.log('Received update request:', req.body); 

        const { username, password, currentPassword } = req.body;
        
        // 验证请求数据是否存在
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: '无效的请求数据' });
        }

        // 验证所有必需字段
        if (!username || !password || !currentPassword) {
            return res.status(400).json({ error: '所有字段都必须填写' });
        }

        // 验证当前密码
        const currentCredentials = await loadCredentials();
        if (currentPassword !== currentCredentials.password) {
            console.log('Current password verification failed');
            return res.status(400).json({ error: '当前密码错误' });
        }

        const newCredentials = {
            username: username,
            password: password
        };

        const saved = await saveCredentials(newCredentials);
        if (!saved) {
            return res.status(500).json({ error: '保存密码失败' });
        }

        credentials = newCredentials;
        
        console.log('Credentials updated successfully');
        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error('Error updating credentials:', error);
        res.status(500).json({ error: '修改失败: ' + error.message });
    }
});

// 管理页面和管理验证
app.use(['/admin', '/'], (req, res, next) => {
    // 排除订阅链接路径
    if (req.path === `/${SUB_TOKEN}`) {
        return next();
    }
    // 排除首页
    if (req.path === '/' && req.method === 'GET') {
        return next();
    }
    // 排除 API 路径
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // 其他路径应用验证
    return auth(req, res, next);
});


// 初始化数据文件
async function initializeDataFile() {
    try {
        let data;
        try {
            // 尝试读取现有文件
            data = await fs.readFile(DATA_FILE, 'utf8');
            console.log('Existing data file found');
        } catch {
            // 文件不存在，创建新文件
            console.log('Creating new data file with initial data...');
            data = JSON.stringify(initialData, null, 2);
            await fs.writeFile(DATA_FILE, data);
            console.log('Data file created successfully');
        }

        const parsedData = JSON.parse(data);
        subscriptions = parsedData.subscriptions || [];
        nodes = parsedData.nodes || '';
        console.log('Data loaded into memory:', { subscriptions, nodes });
    } catch (error) {
        console.error('Error during initialization:', error);
        // 如果出错，使用初始数据
        subscriptions = initialData.subscriptions;
        nodes = initialData.nodes;
    }
}

// 读取数据
async function loadData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsedData = JSON.parse(data);
        
        subscriptions = Array.isArray(parsedData.subscriptions) 
            ? parsedData.subscriptions 
            : [];
            
        nodes = typeof parsedData.nodes === 'string' 
            ? parsedData.nodes 
            : '';

        console.log('Data loaded successfully:', { subscriptions, nodes });
    } catch (error) {
        console.error('Error loading data:', error);
        // 如果出错，初始化为空数据
        subscriptions = [];
        nodes = '';
    }
}

// 添加订阅路由
app.post('/admin/add-subscription', async (req, res) => {
    try {
        const newSubscriptionInput = req.body.subscription?.trim();
        console.log('Attempting to add subscription(s):', newSubscriptionInput);

        if (!newSubscriptionInput) {
            return res.status(400).json({ error: 'Subscription URL is required' });
        }

        if (!Array.isArray(subscriptions)) {
            subscriptions = [];
        }

        // 分割多行输入
        const newSubscriptions = newSubscriptionInput.split('\n')
            .map(sub => sub.trim())
            .filter(sub => sub); // 过滤空行

        // 检查每个订阅是否已存在
        const addedSubs = [];
        const existingSubs = [];

        for (const sub of newSubscriptions) {
            if (subscriptions.some(existingSub => existingSub.trim() === sub)) {
                existingSubs.push(sub);
            } else {
                addedSubs.push(sub);
                subscriptions.push(sub);
            }
        }

        if (addedSubs.length > 0) {
            await saveData(subscriptions, nodes);
            console.log('Subscriptions added successfully. Current subscriptions:', subscriptions);
            
            const message = addedSubs.length === newSubscriptions.length 
                ? '订阅添加成功' 
                : `成功添加 ${addedSubs.length} 个订阅，${existingSubs.length} 个订阅已存在`;
            
            res.status(200).json({ message });
        } else {
            res.status(400).json({ error: '所有订阅已存在' });
        }
    } catch (error) {
        console.error('Error adding subscription:', error);
        res.status(500).json({ error: 'Failed to add subscription' });
    }
});

// 检查并解码 base64
function tryDecodeBase64(str) {
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    try {
        if (base64Regex.test(str)) {
            const decoded = Buffer.from(str, 'base64').toString('utf-8');
            if (decoded.startsWith('vmess://') || 
                decoded.startsWith('vless://') || 
                decoded.startsWith('trojan://') ||
                decoded.startsWith('ss://') ||
                decoded.startsWith('ssr://') ||
                decoded.startsWith('snell://') ||
                decoded.startsWith('juicity://') ||
                decoded.startsWith('hysteria://') ||
                decoded.startsWith('hysteria2://') ||
                decoded.startsWith('tuic://') ||
                decoded.startsWith('wireguard://') ||
                decoded.startsWith('socks5://') ||
                decoded.startsWith('http://') ||
                decoded.startsWith('https://')) {
                return decoded;
            }
        }
        // 如果不是 base64 或解码后不是有效节点，返回原始字符串
        return str;
    } catch (error) {
        console.log('Not a valid base64 string, using original input');
        return str;
    }
}

// 添加节点路由
app.post('/admin/add-node', async (req, res) => {
    try {
        const newNode = req.body.node?.trim();
        console.log('Attempting to add node:', newNode);

        if (!newNode) {
            return res.status(400).json({ error: 'Node is required' });
        }

        let nodesList = typeof nodes === 'string' 
            ? nodes.split('\n').map(n => n.trim()).filter(n => n)
            : [];

        const newNodes = newNode.split('\n')
            .map(n => n.trim())
            .filter(n => n)
            .map(n => tryDecodeBase64(n)); 

        const addedNodes = [];
        const existingNodes = [];

        // 处理每个新节点
        for (const node of newNodes) {
            if (nodesList.some(existingNode => existingNode === node)) {
                existingNodes.push(node);
            } else {
                addedNodes.push(node);
                nodesList.push(node);
            }
        }

        if (addedNodes.length > 0) {
            nodes = nodesList.join('\n');
            await saveData(subscriptions, nodes);
            console.log('Node(s) added successfully');
            
            const message = addedNodes.length === newNodes.length 
                ? '节点添加成功' 
                : `成功添加 ${addedNodes.length} 个节点，${existingNodes.length} 个节点已存在`;
            
            res.status(200).json({ message });
        } else {
            res.status(400).json({ error: '所有节点已存在' });
        }
    } catch (error) {
        console.error('Error adding node:', error);
        res.status(500).json({ error: 'Failed to add node' });
    }
});

// 移除特殊字符
function cleanNodeString(str) {
    return str
        .replace(/^["'`]+|["'`]+$/g, '') // 移除首尾的引号
        .replace(/,+$/g, '') // 移除末尾的逗号
        .replace(/\s+/g, '') // 移除所有空白字符
        .trim();
}

app.post('/admin/delete-subscription', async (req, res) => {
    try {
        const subsToDelete = req.body.subscription?.trim();
        console.log('Attempting to delete subscription(s):', subsToDelete);

        if (!subsToDelete) {
            return res.status(400).json({ error: 'Subscription URL is required' });
        }

        if (!Array.isArray(subscriptions)) {
            subscriptions = [];
            return res.status(404).json({ error: 'No subscriptions found' });
        }

        // 分割多行输入并清理每个订阅字符串
        const deleteList = subsToDelete.split('\n')
            .map(sub => cleanNodeString(sub)) 
            .filter(sub => sub);

        // 记录删除结果
        const deletedSubs = [];
        const notFoundSubs = [];

        // 处理每个要删除的订阅
        deleteList.forEach(subToDelete => {
            const index = subscriptions.findIndex(sub => 
                cleanNodeString(sub) === subToDelete 
            );
            if (index !== -1) {
                deletedSubs.push(subToDelete);
                subscriptions.splice(index, 1);
            } else {
                notFoundSubs.push(subToDelete);
            }
        });

        if (deletedSubs.length > 0) {
            await saveData(subscriptions, nodes);
            console.log('Subscriptions deleted. Remaining subscriptions:', subscriptions);
            
            const message = deletedSubs.length === deleteList.length 
                ? '订阅删除成功' 
                : `成功删除 ${deletedSubs.length} 个订阅，${notFoundSubs.length} 个订阅不存在`;
            
            res.status(200).json({ message });
        } else {
            res.status(404).json({ error: '未找到要删除的订阅' });
        }
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ error: 'Failed to delete subscription' });
    }
});

// 删除节点路由
app.post('/admin/delete-node', async (req, res) => {
    try {
        const nodesToDelete = req.body.node?.trim();
        console.log('Attempting to delete node(s):', nodesToDelete);

        if (!nodesToDelete) {
            return res.status(400).json({ error: 'Node is required' });
        }

        // 分割多行输入并清理每个节点字符串
        const deleteList = nodesToDelete.split('\n')
            .map(node => cleanNodeString(node))
            .filter(node => node); // 过滤空行

        // 获取当前节点列表并清理
        let nodesList = nodes.split('\n')
            .map(node => cleanNodeString(node))
            .filter(node => node);

        // 记录删除结果
        const deletedNodes = [];
        const notFoundNodes = [];

        // 处理每个要删除的节点
        deleteList.forEach(nodeToDelete => {
            const index = nodesList.findIndex(node => {
                // 使用清理后的字符串进行比较
                return cleanNodeString(node) === cleanNodeString(nodeToDelete);
            });
            
            if (index !== -1) {
                deletedNodes.push(nodeToDelete);
                nodesList.splice(index, 1);
            } else {
                notFoundNodes.push(nodeToDelete);
            }
        });

        if (deletedNodes.length > 0) {
            // 更新节点列表
            nodes = nodesList.join('\n');
            await saveData(subscriptions, nodes);
            console.log('Nodes deleted. Remaining nodes:', nodes);
            
            const message = deletedNodes.length === deleteList.length 
                ? '节点删除成功' 
                : `成功删除 ${deletedNodes.length} 个节点，${notFoundNodes.length} 个节点不存在`;
            
            res.status(200).json({ message });
        } else {
            res.status(404).json({ error: '未找到要删除的节点' });
        }
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).json({ error: 'Failed to delete node' });
    }
});

// API路由 - 添加订阅（无需验证）
app.post('/api/add-subscriptions', async (req, res) => {
    try {
        const newSubscriptions = req.body.subscription;
        console.log('API - Attempting to add subscription(s):', newSubscriptions);

        if (!newSubscriptions) {
            return res.status(400).json({ error: 'Subscription URL is required' });
        }

        if (!Array.isArray(subscriptions)) {
            subscriptions = [];
        }

        // 处理输入数据
        const processedSubs = Array.isArray(newSubscriptions)
            ? newSubscriptions.map(sub => sub.trim()).filter(sub => sub)
            : [newSubscriptions.trim()].filter(sub => sub);

        // 检查每个订阅是否已存在
        const addedSubs = [];
        const existingSubs = [];

        for (const sub of processedSubs) {
            if (subscriptions.some(existingSub => existingSub.trim() === sub)) {
                existingSubs.push(sub);
            } else {
                addedSubs.push(sub);
                subscriptions.push(sub);
            }
        }

        if (addedSubs.length > 0) {
            await saveData(subscriptions, nodes);
            res.status(200).json({
                success: true,
                added: addedSubs,
                existing: existingSubs
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'All subscriptions already exist'
            });
        }
    } catch (error) {
        console.error('API Error adding subscription:', error);
        res.status(500).json({ error: 'Failed to add subscription' });
    }
});

// API路由 - 添加节点（无需验证）
app.post('/api/add-nodes', async (req, res) => {
    try {
        const newNodes = req.body.nodes;
        
        if (!newNodes) {
            return res.status(400).json({ error: 'Nodes are required' });
        }

        let nodesList = typeof nodes === 'string'
            ? nodes.split('\n').map(n => n.trim()).filter(n => n)
            : [];

        const processedNodes = Array.isArray(newNodes)
            ? newNodes
            : newNodes.split('\n');

        const nodesToAdd = processedNodes
            .map(n => n.trim())
            .filter(n => n)
            .map(n => tryDecodeBase64(n));

        const addedNodes = [];
        const existingNodes = [];

        for (const node of nodesToAdd) {
            if (nodesList.some(existingNode => existingNode === node)) {
                existingNodes.push(node);
            } else {
                addedNodes.push(node);
                nodesList.push(node);
            }
        }

        if (addedNodes.length > 0) {
            nodes = nodesList.join('\n');
            await saveData(subscriptions, nodes);
            res.status(200).json({
                success: true,
                added: addedNodes,
                existing: existingNodes
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'All nodes already exist'
            });
        }
    } catch (error) {
        console.error('API Error adding nodes:', error);
        res.status(500).json({ error: 'Failed to add nodes' });
    }
});

// API路由 - 删除订阅（无需验证）
app.delete('/api/delete-subscriptions', async (req, res) => {
    try {
        const subsToDelete = req.body.subscription;
        
        if (!subsToDelete) {
            return res.status(400).json({ error: 'Subscription URL is required' });
        }

        if (!Array.isArray(subscriptions)) {
            subscriptions = [];
            return res.status(404).json({ error: 'No subscriptions found' });
        }

        const deleteList = Array.isArray(subsToDelete) 
            ? subsToDelete 
            : subsToDelete.split('\n');

        const processedSubs = deleteList
            .map(sub => cleanNodeString(sub))
            .filter(sub => sub);

        const deletedSubs = [];
        const notFoundSubs = [];

        processedSubs.forEach(subToDelete => {
            const index = subscriptions.findIndex(sub => 
                cleanNodeString(sub) === subToDelete
            );
            if (index !== -1) {
                deletedSubs.push(subToDelete);
                subscriptions.splice(index, 1);
            } else {
                notFoundSubs.push(subToDelete);
            }
        });

        if (deletedSubs.length > 0) {
            await saveData(subscriptions, nodes);
            res.status(200).json({
                success: true,
                deleted: deletedSubs,
                notFound: notFoundSubs
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'No subscriptions found to delete'
            });
        }
    } catch (error) {
        console.error('API Error deleting subscription:', error);
        res.status(500).json({ error: 'Failed to delete subscription' });
    }
});

// API路由 - 删除节点（无需验证）
app.delete('/api/delete-nodes', async (req, res) => {
    try {
        const nodesToDelete = req.body.nodes;

        if (!nodesToDelete) {
            return res.status(400).json({ error: 'Nodes are required' });
        }

        const deleteList = Array.isArray(nodesToDelete)
            ? nodesToDelete
            : nodesToDelete.split('\n');

        const processedNodes = deleteList
            .map(node => cleanNodeString(node))
            .filter(node => node);

        let nodesList = nodes.split('\n')
            .map(node => cleanNodeString(node))
            .filter(node => node);

        const deletedNodes = [];
        const notFoundNodes = [];

        processedNodes.forEach(nodeToDelete => {
            const index = nodesList.findIndex(node => 
                cleanNodeString(node) === cleanNodeString(nodeToDelete)
            );
            
            if (index !== -1) {
                deletedNodes.push(nodeToDelete);
                nodesList.splice(index, 1);
            } else {
                notFoundNodes.push(nodeToDelete);
            }
        });

        if (deletedNodes.length > 0) {
            nodes = nodesList.join('\n');
            await saveData(subscriptions, nodes);
            res.status(200).json({
                success: true,
                deleted: deletedNodes,
                notFound: notFoundNodes
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'No nodes found to delete'
            });
        }
    } catch (error) {
        console.error('API Error deleting nodes:', error);
        res.status(500).json({ error: 'Failed to delete nodes' });
    }
});

// 获取数据
app.get('/admin/data', async (req, res) => {
    try {
        const nodesList = typeof nodes === 'string'
            ? nodes.split('\n').map(n => n.trim()).filter(n => n)
            : [];

        const response = {
            subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
            nodes: nodesList
        };

        console.log('Sending data to client:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// 保存数据
async function saveData(subs, nds) {
    try {
        const data = {
            subscriptions: Array.isArray(subs) ? subs : [],
            nodes: typeof nds === 'string' ? nds : ''
        };
        
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Data saved successfully:', data);
        
        subscriptions = data.subscriptions;
        nodes = data.nodes;
    } catch (error) {
        console.error('Error saving data:', error);
        throw error;
    }
}

// 订阅路由
app.get(`/${SUB_TOKEN}`, async (req, res) => {
    try {
        const queryCFIP = req.query.CFIP;
        const queryCFPORT = req.query.CFPORT;

        if (queryCFIP && queryCFPORT) {
            CFIP = queryCFIP;
            CFPORT = queryCFPORT;
            console.log(`CFIP and CFPORT updated to ${CFIP}:${CFPORT}`);
        }

        // 从文件重新读取最新数据
        await loadData();
        const mergedSubscription = await generateMergedSubscription();
        const base64Content = Buffer.from(mergedSubscription).toString('base64');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(`${base64Content}`);
    } catch (error) {
        console.error(`Error handling /${SUB_TOKEN} route: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

// 首页
app.get('/', function(req, res) {
    res.send('Hello world!');
});

// 生成合并订阅
async function generateMergedSubscription() {
    try {
        const promises = subscriptions.map(async (subscription) => {
            try {
                const subscriptionContent = await fetchSubscriptionContent(subscription);
                if (subscriptionContent) {
                    const decodedContent = decodeBase64Content(subscriptionContent);
                    const updatedContent = replaceAddressAndPort(decodedContent);
                    return updatedContent;
                }
            } catch (error) {
                console.error(`Error fetching subscription content: ${error}`);
            }
            return null;
        });

        const mergedContentArray = await Promise.all(promises);
        const mergedContent = mergedContentArray.filter(content => content !== null).join('\n');

        const updatedNodes = replaceAddressAndPort(nodes);
        return `${mergedContent}\n${updatedNodes}`;
    } catch (error) {
        console.error(`Error generating merged subscription: ${error}`);
        throw error;
    }
}


function decodeBase64Content(base64Content) {
    const decodedContent = Buffer.from(base64Content, 'base64').toString('utf-8');
    return decodedContent;
}

async function fetchSubscriptionContent(subscription) {
    try {
        const response = await axios.get(subscription);
        return response.data;
    } catch (error) {
        console.error(`Error fetching subscription content: ${error}`);
        return null;
    }
}

function replaceAddressAndPort(content) {
    if (!CFIP || !CFPORT) {
        return content;
    }

    return content.split('\n').map(line => {
        line = line.trim();
        if (!line) return line;

        if (line.startsWith('vmess://')) {
            try {
                const base64Part = line.substring(8); // 去掉 'vmess://'
                const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
                const nodeObj = JSON.parse(decoded);

                // 检查是否为 ws 协议且带 TLS
                if (nodeObj.net === 'ws' && nodeObj.tls === 'tls') {
                    nodeObj.add = CFIP;
                    nodeObj.port = parseInt(CFPORT, 10);
                    return 'vmess://' + Buffer.from(JSON.stringify(nodeObj)).toString('base64');
                }
            } catch (error) {
                console.error('Error processing VMess node:', error);
            }
        }
        // 处理 VLESS 和 Trojan 节点
        else if (line.startsWith('vless://') || line.startsWith('trojan://')) {
            try {
                // 检查是否包含 ws 和 tls
                if (line.includes('type=ws') && line.includes('security=tls')) {
                    return line.replace(/@([\w.-]+):(\d+)/, (match, host) => {
                        return `@${CFIP}:${CFPORT}`;
                    });
                }
            } catch (error) {
                console.error('Error processing VLESS/Trojan node:', error);
            }
        }

        // 其他协议（如 tcp、hysteria、hysteria2、tuic snell等）返回原始行
        return line;
    }).join('\n');
}

// 先初始化数据再启动http服务
async function startServer() {
    try {
        // 初始化并加载凭证
        await initializeCredentialsFile();
        credentials = await loadCredentials();
        console.log('Credentials initialized and loaded successfully');
        await initializeDataFile();
        // 启动服务器
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Subscription route is /${SUB_TOKEN}`);
            console.log(`Admin page is available at /`);
            console.log(`Initial credentials: username=${credentials.username}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

startServer();
