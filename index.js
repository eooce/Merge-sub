const express = require('express');
const app = express();
const port = process.env.PORT || 7860;

// 订阅链接数组
const subscriptions = [
    'https://www.bing.com/sub',         // 此处备注名称
    'https://www.sina.com/sub',         // 此处备注名称
    'https://www.yahoo.com/sub',        // 此处备注名称
    'https://www.sougou.com/sub',       // 此处备注名称
     // 继续添加更多订阅链接
];

// 添加新的订阅链接
function addSubscription(subscription) {
  subscriptions.push(subscription);
}

// 处理 POST 请求以添加新的订阅链接
app.use(express.json());

app.post('/add-subscription', (req, res) => {
  const newSubscription = req.body.subscription;
  addSubscription(newSubscription);
  res.status(200).send('Subscription added successfully');
});

// 生成总订阅链接
function generateMergedSubscription() {
  return subscriptions.join('\n');
}

// 添加总订阅链接的路由
app.get('/su', (req, res) => {
  const mergedSubscription = generateMergedSubscription();
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(mergedSubscription);
});

app.use(express.static(__dirname));

app.listen(port, () => {
  console.log(`Total server is running on port ${port}`);
});