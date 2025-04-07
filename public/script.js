let subToken = ''; 

async function fetchSubToken() {
    try {
        const response = await fetch('/get-sub-token');
        if (!response.ok) {
            console.error('获取 SUB_TOKEN 失败: 未授权');
            return;
        }
        const data = await response.json();
        subToken = data.token;
    } catch (error) {
        console.error('获取 SUB_TOKEN 失败:', error);
    }
}

function showAlert(message) {
    const overlay = document.createElement('div');
    overlay.className = 'alert-overlay';
    
    const alertBox = document.createElement('div');
    alertBox.className = 'alert-box';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert-message';
    messageDiv.textContent = message;
    messageDiv.style.textAlign = 'center'; 
    
    const button = document.createElement('button');
    button.className = 'alert-button';
    button.textContent = '确定';
    button.style.margin = '10px auto'; 
    button.style.display = 'block'; 
    
    button.onclick = function() {
        document.body.removeChild(overlay);
    };
    
    alertBox.appendChild(messageDiv);
    alertBox.appendChild(button);
    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);
    
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

async function addItem() {
    const input = document.getElementById('addInput').value.trim();
    if (!input) {
        showAlert('请输入订阅链接或节点');
        return;
    }

    const isSubscription = input.startsWith('http://') || input.startsWith('https://');
    const endpoint = isSubscription ? '/admin/add-subscription' : '/admin/add-node';
    const body = isSubscription ? { subscription: input } : { node: input };

    try {
        console.log('Sending add request:', { endpoint, body });
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (response.ok) {
            showAlert(result.message);
            document.getElementById('addInput').value = '';
            await fetchData();
        } else {
            showAlert(result.error || '添加失败');
        }
    } catch (error) {
        console.error('添加时发生错误:', error);
        showAlert('添加失败: ' + (error.message || '未知错误'));
    }
}

async function fetchData() {
    try {
        const response = await fetch('/admin/data');
        const data = await response.json();
        console.log('Fetched data:', data);
        
        const formattedData = {
            subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
            nodes: Array.isArray(data.nodes) ? data.nodes : []
        };
        
        document.getElementById('data').textContent = 
            JSON.stringify(formattedData, null, 2);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('data').textContent = 'Error loading data';
    }
}

async function deleteItem() {
    const input = document.getElementById('deleteInput').value.trim();
    if (!input) {
        showAlert('请输入要删除的订阅链接或节点');
        return;
    }

    const isSubscription = input.startsWith('http://') || input.startsWith('https://');
    const endpoint = isSubscription ? '/admin/delete-subscription' : '/admin/delete-node';
    const body = isSubscription ? { subscription: input } : { node: input };

    try {
        console.log('Sending delete request:', { endpoint, body });
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log('Server response:', result);

        document.getElementById('deleteInput').value = '';
        await fetchData();
        
        showAlert(result.message || '删除成功');
    } catch (error) {
        console.error('删除时发生错误:', error);
        showAlert('删除失败: ' + (error.message || '未知错误'));
    }
}

function createSubscriptionLine(label, url) {
    const line = document.createElement('div');
    line.className = 'subscription-line';
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    
    const urlDiv = document.createElement('div');
    urlDiv.className = 'subscription-url';
    urlDiv.textContent = url;
    
    const copyIndicator = document.createElement('span');
    copyIndicator.className = 'copy-indicator';
    copyIndicator.textContent = '已复制';
    
    line.appendChild(labelSpan);
    line.appendChild(urlDiv);
    line.appendChild(copyIndicator);
    
    urlDiv.onclick = async () => {
        try {
            await navigator.clipboard.writeText(url);
            copyIndicator.style.display = 'inline';
            setTimeout(() => {
                copyIndicator.style.display = 'none';
            }, 1000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };
    
    return line;
}

async function showSubscriptionInfo() {
    try {
        const response = await fetch('/get-sub-token');
        if (!response.ok) {
            showAlert('请先登录');
            return;
        }
        
        const data = await response.json();
        subToken = data.token;
        
        const currentDomain = window.location.origin;
        
        const overlay = document.createElement('div');
        overlay.className = 'alert-overlay';
        
        const alertBox = document.createElement('div');
        alertBox.className = 'alert-box subscription-info';
        
        const defaultSubLine = createSubscriptionLine(
            '默认订阅链接：',
            `${currentDomain}/${subToken}`
        );
        
        const customSubLine = createSubscriptionLine(
            '带优选IP订阅链接：',
            `${currentDomain}/${subToken}?CFIP=www.visa.com.sg&CFPORT=443`
        );
        
        const noteDiv = document.createElement('div');
        noteDiv.className = 'subscription-note';
        noteDiv.textContent = '提醒：将www.visa.com.sg和443改为更快的优选ip或优选域名和对应的端口';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'alert-button';
        closeButton.textContent = '关闭';
        closeButton.style.width = '100%';
        closeButton.onclick = () => document.body.removeChild(overlay);
        
        alertBox.appendChild(defaultSubLine);
        alertBox.appendChild(customSubLine);
        alertBox.appendChild(noteDiv);
        alertBox.appendChild(closeButton);
        overlay.appendChild(alertBox);
        document.body.appendChild(overlay);
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        };
    } catch (error) {
        console.error('Error:', error);
        showAlert('获取订阅信息失败，请确保已登录');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchSubToken();
    await fetchData();
});
