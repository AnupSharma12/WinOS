let winCount = 0;
let topZ = 100;

function openApp(appName, iconPath) {
    winCount++;
    topZ++;
    
    const winId = `win-${winCount}`;
    const winElement = document.createElement('div');
    
    winElement.className = 'window';
    winElement.id = winId;
    winElement.style.zIndex = topZ;
    winElement.style.left = (120 + winCount * 25) + "px"; 
    winElement.style.top = (50 + winCount * 25) + "px";

    winElement.innerHTML = `
        <div class="title-bar" onmousedown="makeDraggable(event, '${winId}')">
            <span style="font-size:12px;">${appName}</span>
            <div class="win-controls">
                <button class="win-btn" onclick="minimizeApp('${winId}')">_</button>
                <button class="win-btn" onclick="toggleMaximize('${winId}')">□</button>
                <button class="win-btn close" onclick="closeApp('${winId}')">×</button>
            </div>
        </div>
        <div class="content" style="height:100%">${getAppContent(appName, winId)}</div>
    `;

    document.getElementById('desktop').appendChild(winElement);
    addTaskbarIcon(winId, iconPath);
    
    winElement.onmousedown = () => { 
        topZ++; 
        winElement.style.zIndex = topZ; 
    };
    
    document.getElementById('startMenu').classList.add('hidden');
}

function getAppContent(appName, winId) {
    if (appName === 'Notepad') {
        return '<textarea style="width:100%; height:100%; border:none; outline:none; font-family:inherit;" placeholder="Type some notes here..."></textarea>';
    }
    
    if (appName === 'Terminal') {
        return '<div style="background:#0c0c0c; color:#0f0; height:100%; padding:10px; font-family:monospace; font-size:13px;">C:\\Users\\Anup> <span style="animation: blink 1s step-end infinite;">_</span></div>';
    }
    
    if (appName === 'Settings') {
        return `
            <div style="padding: 10px;">
                <h3>System Settings</h3>
                <p><strong>User:</strong> Anup Sharma</p>
                <p><strong>OS:</strong> WinOS v1.5</p>
                <p><strong>Storage:</strong> Practically infinite</p>
            </div>
        `;
    }
    
    if (appName === 'Calculator') {
        return `
        <div style="height:100%; display:flex; flex-direction:column; gap:10px;">
            <input id="calc-display-${winId}" type="text" value="" readonly
                style="width:100%; height:40px; font-size:18px; text-align:right; padding:8px; border:1px solid #ccc; border-radius:6px; background:#f9f9f9;">
            <div style="flex:1; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
                <button class="calc-btn" style="padding:10px; background:#ffd1d1; border:1px solid #fca5a5; border-radius:4px; cursor:pointer;" onclick="calcClear('${winId}')">C</button>
                <button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '/')">/</button>
                <button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '*')">x</button>
                <button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '-')">-</button>
                
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '7')">7</button>
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '8')">8</button>
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '9')">9</button>
                <button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '+')">+</button>
                
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '4')">4</button>
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '5')">5</button>
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '6')">6</button>
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '.')">.</button>
                
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '1')">1</button>
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '2')">2</button>
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress('${winId}', '3')">3</button>
                <button class="calc-btn" style="padding:10px; background:#d1e8ff; border:1px solid #a5ccfc; border-radius:4px; cursor:pointer;" onclick="calcEvaluate('${winId}')">=</button>
                
                <button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer; grid-column: span 4;" onclick="calcPress('${winId}', '0')">0</button>
            </div>
        </div>
        `;
    }
    
    return `<div style="padding:20px; text-align:center;">
        <h4>Welcome to ${appName}</h4>
        <p style="color:#666;">This app is currently under construction.</p>
    </div>`;
}

function calcPress(winId, value) {
    const display = document.getElementById(`calc-display-${winId}`);
    if (!display) return;
    display.value += value;
}

function calcClear(winId) {
    const display = document.getElementById(`calc-display-${winId}`);
    if (!display) return;
    display.value = '';
}

function calcEvaluate(winId) {
    const display = document.getElementById(`calc-display-${winId}`);
    if (!display) return;
    try {
        const result = Function(`"use strict"; return (${display.value});`)();
        display.value = Number.isFinite(result) ? String(result) : 'Error';
    } catch (err) {
        display.value = 'Error';
    }
}

function addTaskbarIcon(winId, iconPath) {
    const container = document.getElementById('taskbar-apps');
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'task-item';
    iconDiv.id = `task-${winId}`;
    iconDiv.innerHTML = `<img src="${iconPath}">`;
    
    iconDiv.onclick = () => {
        const win = document.getElementById(winId);
        if (!win) return;
        
        if (win.dataset.minimized === 'true') {
            win.style.display = 'flex';
            win.dataset.minimized = 'false';
        }
        
        topZ++;
        win.style.zIndex = topZ;
    };
    
    container.appendChild(iconDiv);
}

function minimizeApp(winId) {
    const win = document.getElementById(winId);
    if (!win) return;
    
    win.style.display = 'none';
    win.dataset.minimized = 'true';
}

function toggleMaximize(winId) {
    const win = document.getElementById(winId);
    if (!win) return;
    
    const isCurrentlyMaximized = win.dataset.maximized === 'true';
    
    if (!isCurrentlyMaximized) {
        win.dataset.prevLeft = win.style.left;
        win.dataset.prevTop = win.style.top;
        win.dataset.prevWidth = win.style.width;
        win.dataset.prevHeight = win.style.height;
        
        win.style.left = '0px';
        win.style.top = '0px';
        win.style.width = '100%';
        win.style.height = 'calc(100% - 40px)';
        win.dataset.maximized = 'true';
    } else {
        win.style.left = win.dataset.prevLeft || '120px';
        win.style.top = win.dataset.prevTop || '50px';
        win.style.width = win.dataset.prevWidth || '550px';
        win.style.height = win.dataset.prevHeight || '400px';
        win.dataset.maximized = 'false';
    }
}

function closeApp(winId) {
    const win = document.getElementById(winId);
    const taskIcon = document.getElementById(`task-${winId}`);
    
    if (win) win.remove();
    if (taskIcon) taskIcon.remove();
}

// Draggable window logic
function makeDraggable(e, winId) {
    const windowEl = document.getElementById(winId);
    
    e.preventDefault();
    document.body.classList.add('no-select');
    
    let offsetX = e.clientX - windowEl.offsetLeft;
    let offsetY = e.clientY - windowEl.offsetTop;
    
    function moveWindow(event) { 
        if (windowEl.dataset.maximized === 'true') return;
        
        windowEl.style.left = (event.clientX - offsetX) + 'px'; 
        windowEl.style.top = (event.clientY - offsetY) + 'px'; 
    }
    
    function stopDragging() {
        document.body.classList.remove('no-select');
        window.removeEventListener('mousemove', moveWindow);
        window.removeEventListener('mouseup', stopDragging);
    }
    
    window.addEventListener('mousemove', moveWindow);
    window.addEventListener('mouseup', stopDragging);
}

// System UI handlers
document.getElementById('startBtn').onclick = (e) => { 
    e.stopPropagation(); 
    document.getElementById('startMenu').classList.toggle('hidden'); 
};

document.onclick = () => {
    document.getElementById('startMenu').classList.add('hidden');
};

// Clock logic
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    let minutes = now.getMinutes();
    if (minutes < 10) minutes = "0" + minutes;
    
    document.getElementById('clock').innerText = hours + ":" + minutes;
}

setInterval(updateClock, 1000); 
updateClock();
