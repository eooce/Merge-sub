const express = require('express');
const axios = require('axios');
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

async function generateMergedSubscription() {
  try {
    const promises = subscriptions.map(async (subscription) => {
      try {
        const subscriptionContent = await fetchSubscriptionContent(subscription);
        if (subscriptionContent) {
          const decodedContent = decodeBase64Content(subscriptionContent);
          return decodedContent;
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

app.get("/", function(req, res) {
  res.send("Hello world!");
});

app.get('/sum', async (req, res) => {
  try {
    const mergedSubscription = await generateMergedSubscription();
    const base64Content = Buffer.from(mergedSubscription).toString('base64');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`${base64Content}`);
  } catch (error) {
    console.error(`Error handling /sum route: ${error}`);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Total server is running on port ${port}`);
});
