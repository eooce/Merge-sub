function showAlert(message) {
    const overlay = document.createElement('div');
    overlay.className = 'alert-overlay';
    
    const alertBox = document.createElement('div');
    alertBox.className = 'alert-box';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert-message';
    messageDiv.textContent = message;
    
    const button = document.createElement('button');
    button.className = 'alert-button';
    button.textContent = '确定';
    
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

document.addEventListener('DOMContentLoaded', fetchData);