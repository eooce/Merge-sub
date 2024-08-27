const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 7860;
let CFIP = process.env.CFIP || "www.visa.com.tw";  // 优选ip或优选域名
let CFPORT = process.env.CFPORT || "8443";        // 优选ip或优选域名

// 可带参数访问：http://部署的服务器ip或域名:运行的端口/sub?CFIP=优选ip或优选域名&CFPORT=优选ip或有序域名对应的端口
// 例如：http://192.168.1.1:10000/sub?CFIP=47.75.222.188&CFPORT=7890

// 订阅链接数组
const subscriptions = [
  'https://www.bing.com/sub',         // 此处备注名称
  'https://www.sina.com/sub',         // 此处备注名称
  'https://www.yahoo.com/sub',        // 此处备注名称
  'https://www.sougou.com/sub',       // 此处备注名称
   // 继续添加更多订阅链接
];

function addSubscription(subscription) {
    subscriptions.push(subscription);
}

app.use(express.json());

app.post('/add-subscription', (req, res) => {
    const newSubscription = req.body.subscription;
    addSubscription(newSubscription);
    res.status(200).send('Subscription added successfully');
});

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
        if (line.startsWith('vmess://')) {
            const base64Part = line.substring(8);
            const decodedVmess = Buffer.from(base64Part, 'base64').toString('utf-8');
            const vmessObj = JSON.parse(decodedVmess);

            vmessObj.add = CFIP;
            vmessObj.port = parseInt(CFPORT, 10);

            const updatedVmess = Buffer.from(JSON.stringify(vmessObj)).toString('base64');
            return `vmess://${updatedVmess}`;
        } else if (line.startsWith('vless://') || line.startsWith('trojan://')) {
            // 使用正则表达式匹配并替换 IP 和端口
            return line.replace(/(@)([\d.]+):(\d+)/, (match, atSymbol, ip, port) => {
                return `${atSymbol}${CFIP}:${CFPORT}`;
            });
        }

        return line;
    }).join('\n');
}

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
        return mergedContent;
    } catch (error) {
        console.error(`Error generating merged subscription: ${error}`);
        throw error;
    }
}

app.get('/sub', async (req, res) => {
    try {
        const queryCFIP = req.query.CFIP;
        const queryCFPORT = req.query.CFPORT;

        if (queryCFIP && queryCFPORT) {
            CFIP = queryCFIP;
            CFPORT = queryCFPORT;
            console.log(`CFIP and CFPORT updated to ${CFIP}:${CFPORT}`);
        }

        const mergedSubscription = await generateMergedSubscription();
        const base64Content = Buffer.from(mergedSubscription).toString('base64');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(`${base64Content}`);
    } catch (error) {
        console.error(`Error handling /sub route: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/', function(req, res) {
    res.send('Hello world!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
