let subToken = ''; 
let apiUrl = ''; 

async function fetchApiUrl() {
    try {
        const response = await fetch('/get-apiurl');
        if (response.ok) {
            const data = await response.json();
            apiUrl = data.ApiUrl || 'https://sublink.eooce.com'; // 兜底apiurl
        } else {
            apiUrl = 'https://sublink.eooce.com'; 
        }
    } catch (e) {
        apiUrl = 'https://sublink.eooce.com';
    }
}

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

function copyToClipboard(element, text) { 
    const textArea = document.createElement('textarea'); 
    textArea.value = text; 
    document.body.appendChild(textArea); 
    
    try { 
        textArea.select(); 
        document.execCommand('copy'); 
        const copyIndicator = document.createElement('span');
        copyIndicator.textContent = '已复制';
        copyIndicator.style.color = '#28a745';
        copyIndicator.style.marginLeft = '5px';
        copyIndicator.style.fontWeight = 'bold';
        element.appendChild(copyIndicator);
        setTimeout(() => { 
            element.removeChild(copyIndicator);
        }, 1000); 
    } catch (err) { 
        console.error('复制失败:', err); 
    } finally { 
        document.body.removeChild(textArea); 
    } 
} 

async function fetchData() {
    try {
        const response = await fetch('/admin/data');
        const data = await response.json();
        console.log('Fetched data:', data);
        
        let formattedText = '<div style="margin-top: 0; padding-top: 0"><h2 style="margin: 1px 0; color: #007bff">subscriptions:</h2>';
        if (Array.isArray(data.subscriptions)) {
            formattedText += data.subscriptions.map(sub => 
                `<div style="cursor: pointer" onclick="copyToClipboard(this, '${sub.replace(/'/g, "\\'")}')">${sub}</div>`
            ).join('');
        }
        
        formattedText += '<h2 style="margin: 1px 0; color: #007bff">nodes:</h2>';
        if (typeof data.nodes === 'string') {
            const formattedNodes = data.nodes.split('\n').map(node => {
                const formatted = node.replace(/(vmess|vless|trojan|ss|ssr|snell|juicity|hysteria|hysteria2|tuic|anytls|wireguard|socks5|https?):\/\//g, 
                    (match) => `<strong style="color: #dc3545">${match}</strong>`);
                return `<div style="cursor: pointer" onclick="copyToClipboard(this, '${node.replace(/'/g, "\\'")}')">${formatted}</div>`;
            }).join('');
            formattedText += formattedNodes;
        } else if (Array.isArray(data.nodes)) {
            const formattedNodes = data.nodes.map(node => {
                const formatted = node.replace(/(vmess|vless|trojan|ss|ssr|snell|juicity|hysteria|hysteria2|tuic|anytls|wireguard|socks5|https?):\/\//g, 
                    (match) => `<strong style="color: #dc3545">${match}</strong>`);
                return `<div style="cursor: pointer" onclick="copyToClipboard(this, '${node.replace(/'/g, "\\'")}')">${formatted}</div>`;
            }).join('');
            formattedText += formattedNodes;
        }
        formattedText += '</div>';
        
        document.getElementById('data').innerHTML = formattedText;
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
    await fetchApiUrl();
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
    copyIndicator.style.fontSize = '1rem';
    copyIndicator.style.fontWeight = 'bold';
    
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
            '默认订阅链接(base64)：',
            `${currentDomain}/${subToken}`
        );
        
        const customSubLine = createSubscriptionLine(
            '带优选IP订阅链接(base64)：',
            `${currentDomain}/${subToken}?CFIP=time.is&CFPORT=443`
        );

        const clashSubLine = createSubscriptionLine(
            'clash订阅(FIclash/Mihomo/ClashMeta)：',
            `${apiUrl}/clash?config=${currentDomain}/${subToken}`
        );

        const singboxSubLine = createSubscriptionLine(
            'sing-box订阅：',
            `${apiUrl}/singbox?config=${currentDomain}/${subToken}`
        );
        
        const noteDiv = document.createElement('div');
        noteDiv.className = 'subscription-note';
        noteDiv.textContent = '提醒：将time.is和443改为更快的优选ip或优选域名和对应的端口。\n部署时可添加API_URL环境变量修改转换地址。\n订阅转换项目：https://github.com/eooce/sub-converter';
        noteDiv.style.whiteSpace = 'pre-line';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'alert-button';
        closeButton.textContent = '关闭';
        closeButton.style.width = '100%';
        closeButton.onclick = () => document.body.removeChild(overlay);
        
        alertBox.appendChild(defaultSubLine);
        alertBox.appendChild(customSubLine);
        alertBox.appendChild(clashSubLine);
        alertBox.appendChild(singboxSubLine);
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
        showAlert('获取订阅信息失败，请先登录');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchApiUrl(); 
    await fetchSubToken();
    await fetchData();
});

// 主题切换功能
(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  // 主题切换svg按钮
  const moonSVG = '<svg class="custom-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z" fill="#333"/></svg>';
  const sunSVG = '<svg class="custom-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke="#fff" stroke-width="2"/><g stroke="#fff" stroke-width="2"><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g></svg>';

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      themeIcon.innerHTML = sunSVG + moonSVG;
    } else {
      document.body.classList.remove('dark-theme');
      themeIcon.innerHTML = moonSVG + sunSVG;
    }
    localStorage.setItem('theme', theme);
  }

  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const isDark = document.body.classList.contains('dark-theme');
      setTheme(isDark ? 'light' : 'dark');
    });
  }
})();
