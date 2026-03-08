// ========== Virtual File System ==========
var VFS = {
    'C:': {
        type: 'dir',
        children: {
            'Users': {
                type: 'dir',
                children: {
                    'Anup': {
                        type: 'dir',
                        children: {
                            'Desktop':  { type: 'dir', children: { 'anupsharma.pdf': { type: 'file', content: 'link' } } },
                            'Documents': { type: 'dir', children: { 'notes.txt': { type: 'file', content: 'Welcome to WinOS Explorer!\n\nThis is a fully functional virtual file system.\nTry using the Terminal to navigate here and read this file.' } } },
                            'Downloads': { type: 'dir', children: { 'installer.exe': { type: 'file', content: '[binary data]' } } },
                            'Pictures':  { type: 'dir', children: { 'wallpaper.jpg': { type: 'file', content: '[image data]' } } },
                            'Projects':  { type: 'dir', children: {} }
                        }
                    }
                }
            },
            'WinOS': { type: 'dir', children: { 'System32': { type: 'dir', children: {} } } }
        }
    }
};


/* -- VFS global state -- */
var currentVfsPath = 'C:\\Users\\Anup';   // Explorer's current directory
var terminalPath   = 'C:\\Users\\Anup';   // Terminal's working directory
var winCount = 0;                          // Auto-incrementing window ID counter
var topZ     = 100;                        // Tracks the highest z-index for window stacking


/* -- Path conversion helpers -- */

// Convert forward slashes to backslashes (Unix -> Windows style)
function toWinPath(p) {
    return p.replace(/\//g, '\\');
}

function toUnixPath(p) {
    return p.replace(/\\/g, '/');
}

function getVfsNode(winPath) {
    var parts = toUnixPath(winPath).split('/').filter(function(p) { return p !== ''; });
    if (parts.length === 0) return null;
    var root = parts[0];
    if (root === 'C:' && VFS['C:']) {
        var node = VFS['C:'];
        for (var i = 1; i < parts.length; i++) {
            if (node && node.type === 'dir' && node.children && node.children[parts[i]]) {
                node = node.children[parts[i]];
            } else {
                return null;
            }
        }
        return node;
    }
    return null;
}

function resolvePath(basePath, relativePath) {
    if (!relativePath) return basePath;
    var rel = toUnixPath(relativePath);
    if (rel.match(/^[A-Z]:/i)) return toWinPath(rel);
    var base = toUnixPath(basePath);
    var combined = base + '/' + rel;
    var parts = combined.split('/');
    var result = [];
    for (var i = 0; i < parts.length; i++) {
        if (parts[i] === '' || parts[i] === '.') continue;
        if (parts[i] === '..') {
            if (result.length > 1) result.pop();
        } else {
            result.push(parts[i]);
        }
    }
    return toWinPath(result.join('/'));
}

// ========== Explorer ==========
window.vfsState = {
    renderExplorer: function(winId) {
        var node = getVfsNode(currentVfsPath);
        var itemsHTML = '';

        if (node && node.type === 'dir') {
            var names = Object.keys(node.children);
            if (names.length === 0) {
                itemsHTML = '<div style="padding:30px; color:#888;">This folder is empty</div>';
            }
            for (var i = 0; i < names.length; i++) {
                var name = names[i];
                var isDir = node.children[name].type === 'dir';
                var icon = isDir ? '📁' : '📄';
                if (name.endsWith('.txt')) icon = '📝';
                if (name.endsWith('.jpg') || name.endsWith('.png')) icon = '🖼️';
                itemsHTML += '<div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; padding:8px; border-radius:4px; width:80px; height:85px; text-align:center;" ' +
                    'onmouseover="this.style.background=\'rgba(0,120,212,0.1)\'" onmouseout="this.style.background=\'transparent\'" ' +
                    'ondblclick="window.vfsState.open(\'' + winId + '\',\'' + name + '\')">' +
                    '<span style="font-size:36px;">' + icon + '</span>' +
                    '<span style="font-size:11px; margin-top:6px; word-break:break-all;">' + name + '</span></div>';
            }
        }

        var folders = [
            ['⭐ Home',      'C:\\Users\\Anup'],
            ['🖥️ Desktop',  'C:\\Users\\Anup\\Desktop'],
            ['⬇️ Downloads', 'C:\\Users\\Anup\\Downloads'],
            ['📄 Documents', 'C:\\Users\\Anup\\Documents'],
            ['🖼️ Pictures', 'C:\\Users\\Anup\\Pictures'],
            ['💻 This PC',   'C:']
        ];
        var sidebar = '';
        for (var s = 0; s < folders.length; s++) {
            var bg = currentVfsPath === folders[s][1] ? 'background:rgba(0,120,212,0.1);' : '';
            sidebar += '<div style="padding:6px 10px; cursor:pointer; border-radius:4px; font-size:13px;' + bg + '" ' +
                'onclick="window.vfsState.goTo(\'' + winId + '\',\'' + folders[s][1].replace(/\\/g, '\\\\') + '\')">' + folders[s][0] + '</div>';
        }

        var count = node && node.type === 'dir' ? Object.keys(node.children).length : 0;
        var html = '<div style="flex:1; display:flex; flex-direction:column; font-family:Segoe UI,sans-serif; background:#f3f3f3;">' +
            '<div style="display:flex; padding:6px 12px; background:#fff; border-bottom:1px solid #e5e5e5; gap:8px; align-items:center;">' +
                '<button style="border:none; background:transparent; padding:4px 8px; cursor:pointer; font-size:16px; border-radius:4px;" onclick="window.vfsState.goUp(\'' + winId + '\')" title="Up">⬆</button>' +
                '<div style="flex:1; border:1px solid #d1d1d1; border-radius:4px; padding:4px 10px; display:flex; background:#fff; align-items:center;">' +
                    '<span style="color:#666; margin-right:8px;">📁</span>' +
                    '<input type="text" id="' + winId + '-address" value="' + currentVfsPath + '" style="border:none; outline:none; flex:1; font-size:13px;" onkeydown="if(event.key===\'Enter\') window.vfsState.goTo(\'' + winId + '\', this.value)">' +
                '</div>' +
                '<button style="border:none; background:transparent; padding:4px 8px; cursor:pointer; font-size:14px; border-radius:4px;" onclick="window.vfsState.newFolder(\'' + winId + '\')" title="New Folder">➕</button>' +
            '</div>' +
            '<div style="display:flex; flex:1; overflow:hidden;">' +
                '<div style="width:160px; border-right:1px solid #e5e5e5; padding:8px 4px; background:#f9f9f9; overflow-y:auto;">' + sidebar + '</div>' +
                '<div style="flex:1; padding:15px; display:flex; gap:5px; align-content:flex-start; flex-wrap:wrap; background:#fff; overflow-y:auto;">' + itemsHTML + '</div>' +
            '</div>' +
            '<div style="padding:4px 12px; background:#f3f3f3; font-size:11px; color:#888; border-top:1px solid #e5e5e5;">' + count + ' items</div>' +
        '</div>';

        var el = document.getElementById(winId + '-content');
        if (el) el.innerHTML = html;
        return html;
    },

    open: function(winId, name) {
        var path = currentVfsPath + '\\' + name;
        var node = getVfsNode(path);
        if (!node) return;
        if (node.type === 'dir') {
            currentVfsPath = path;
            this.renderExplorer(winId);
        } else if (name.endsWith('.txt')) {
            openFile(name, node.content);
        }
    },

    goTo: function(winId, path) {
        var p = path.replace(/\//g, '\\');
        if (getVfsNode(p)) { currentVfsPath = p; this.renderExplorer(winId); }
    },

    goUp: function(winId) {
        var parts = currentVfsPath.split('\\');
        if (parts.length > 1) { parts.pop(); currentVfsPath = parts.join('\\') || 'C:'; this.renderExplorer(winId); }
    },

    newFolder: function(winId) {
        var node = getVfsNode(currentVfsPath);
        if (!node || node.type !== 'dir') return;
        var name = prompt('Folder name:', 'New folder');
        if (name && !node.children[name]) { node.children[name] = { type: 'dir', children: {} }; this.renderExplorer(winId); }
    }
};

// ========== Terminal ==========
function handleTerminalCommand(e, termId) {
    if (e.key !== 'Enter') return;
    var input = document.getElementById(termId);
    var output = document.getElementById(termId + '-output');
    var cmd = input.value.trim();
    input.value = '';
    var result = '';

    output.innerHTML += '<div><span style="color:#189a18;">' + terminalPath + '&gt;</span> ' + cmd + '</div>';

    if (cmd) {
        var args = cmd.split(' ');
        var command = args[0].toLowerCase();
        var node = getVfsNode(terminalPath);

        if (command === 'help') {
            result = 'cd, dir, cls, help';

        } else if (command === 'cd') {
            if (args[1]) {
                var targetPath = resolvePath(terminalPath, args.slice(1).join(' '));
                if (getVfsNode(targetPath)) {
                    terminalPath = targetPath;
                } else {
                    result = 'Path not found.';
                }
            } else {
                result = terminalPath;
            }

        } else if (command === 'dir' || command === 'ls') {
            if (node && node.children) {
                var keys = Object.keys(node.children);
                result = keys.map(function(k) { return (node.children[k].type === 'dir' ? '📁 ' : '📄 ') + k; }).join('<br>') || 'Empty';
            }

        } else if (command === 'cls' || command === 'clear') {
            output.innerHTML = '';
        } else {
            result = '"' + command + '" is not recognized. Type help.';
        }
    }

    if (result) output.innerHTML += '<div style="margin-bottom:8px;">' + result + '</div>';
    var promptEl = document.getElementById(termId + '-prompt');
    if (promptEl) promptEl.textContent = terminalPath + '>';
    output.scrollTop = output.scrollHeight;
}

// ========== WINDOW MANAGEMENT ==========


// Apps that fill their content area edge-to-edge (no padding)
var fullBleedApps = ['Explorer', 'Terminal', 'Browser', 'Spotify', 'Calculator', 'TicTacToe', 'Quiz', 'Typing'];

// Open a new application window on the desktop
function openApp(appName, iconPath) {
    winCount++;
    topZ++;

    var winId = 'win-' + winCount;
    var winElement = document.createElement('div');
    winElement.className = 'window';
    winElement.id = winId;
    winElement.style.zIndex = topZ;
    winElement.style.left = (120 + winCount * 25) + 'px';
    winElement.style.top  = (50 + winCount * 25) + 'px';

    var content = getAppContent(appName, winId);
    var contentPadding = fullBleedApps.indexOf(appName) > -1 ? 'padding:0;' : '';

    winElement.innerHTML =
        '<div class="title-bar" onmousedown="makeDraggable(event, \'' + winId + '\')">' +
            '<span style="font-size:12px;">' + appName + '</span>' +
            '<div class="win-controls">' +
                '<button class="win-btn" onclick="minimizeApp(\'' + winId + '\')">' + '_' + '</button>' +
                '<button class="win-btn" onclick="toggleMaximize(\'' + winId + '\')">' + '□' + '</button>' +
                '<button class="win-btn close" onclick="closeApp(\'' + winId + '\')">' + '×' + '</button>' +
            '</div>' +
        '</div>' +
        '<div class="content" style="' + contentPadding + '">' + content + '</div>';

    document.getElementById('desktop').appendChild(winElement);
    addTaskbarIcon(winId, iconPath);

    winElement.onmousedown = function() {
        topZ++;
        winElement.style.zIndex = topZ;
    };

    document.getElementById('startMenu').classList.add('hidden');

    if (appName === 'Explorer') {
        setTimeout(function() { window.vfsState.renderExplorer(winId); }, 50);
    }
    if (appName === 'Quiz') {
        setTimeout(function() { quizInit('quiz-' + winId); }, 50);
    }
    if (appName === 'Typing') {
        setTimeout(function() { typingInit('type-' + winId); }, 50);
    }
}

function openFile(fileName, content) {
    winCount++;
    topZ++;
    var winId = 'win-' + winCount;
    var winElement = document.createElement('div');
    winElement.className = 'window';
    winElement.id = winId;
    winElement.style.zIndex = topZ;
    winElement.style.left = (140 + winCount * 25) + 'px';
    winElement.style.top  = (70 + winCount * 25) + 'px';

    // Escape HTML entities in the file content to prevent rendering
    var safeContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    winElement.innerHTML =
        '<div class="title-bar" onmousedown="makeDraggable(event, \'' + winId + '\')">' +
            '<span style="font-size:12px;">' + fileName + ' - Notepad</span>' +
            '<div class="win-controls">' +
                '<button class="win-btn" onclick="minimizeApp(\'' + winId + '\')">' + '_' + '</button>' +
                '<button class="win-btn" onclick="toggleMaximize(\'' + winId + '\')">' + '□' + '</button>' +
                '<button class="win-btn close" onclick="closeApp(\'' + winId + '\')">' + '×' + '</button>' +
            '</div>' +
        '</div>' +
        '<div class="content">' +
            '<textarea style="width:100%; height:100%; border:none; outline:none; font-family:Consolas,monospace; font-size:14px; padding:10px; resize:none;">' + safeContent + '</textarea>' +
        '</div>';

    document.getElementById('desktop').appendChild(winElement);
    addTaskbarIcon(winId, 'img/notepad.png');

    winElement.onmousedown = function() { topZ++; winElement.style.zIndex = topZ; };
}

function getAppContent(appName, winId) {
    if (appName === 'Notepad') {
        return '<textarea style="width:100%; height:100%; border:none; outline:none; font-family:Consolas,monospace; font-size:14px; padding:10px; resize:none;" placeholder="Type some notes here..."></textarea>';
    }

    if (appName === 'Terminal') {
        var termId = 'term-' + winId;
        return '<div style="background:#0c0c0c; color:#cccccc; height:100%; padding:10px; font-family:Cascadia Code,Consolas,monospace; font-size:14px; display:flex; flex-direction:column; cursor:text;" onclick="document.getElementById(\'' + termId + '\').focus()">' +
            '<div id="' + termId + '-output" style="overflow-y:auto; flex:1; margin-bottom:10px;">' +
                '<div style="color:#fff; font-weight:bold;">WinOS Terminal</div>' +
                '<div>Copyright (C) WinOS. All rights reserved.</div>' +
                '<br>' +
            '</div>' +
            '<div style="display:flex; align-items:center;">' +
                '<span id="' + termId + '-prompt" style="margin-right:8px; color:#189a18;">' + terminalPath + '></span>' +
                '<input id="' + termId + '" type="text" style="flex:1; background:transparent; border:none; color:#cccccc; outline:none; font-family:Cascadia Code,Consolas,monospace; font-size:14px;" onkeydown="handleTerminalCommand(event, \'' + termId + '\')" autofocus>' +
            '</div>' +
        '</div>';
    }

    if (appName === 'Settings') {
        return '<div style="padding:20px; font-family:Segoe UI,sans-serif;">' +
            '<h3 style="margin-top:0;">System Settings</h3>' +
            '<p><strong>User:</strong> Anup Sharma</p>' +
            '<p><strong>OS:</strong> WinOS</p>' +
            '<p><strong>Version:</strong> 11.0</p>' +
            '<p><strong>Storage:</strong> Practically infinite</p>' +
        '</div>';
    }

    if (appName === 'Calculator') {
        return '<div style="height:100%; display:flex; flex-direction:column; gap:10px;">' +
            '<input id="calc-display-' + winId + '" type="text" value="" readonly style="width:100%; height:40px; font-size:18px; text-align:right; padding:8px; border:1px solid #ccc; border-radius:6px; background:#f9f9f9;">' +
            '<div style="flex:1; display:grid; grid-template-columns:repeat(4,1fr); gap:8px;">' +
                '<button class="calc-btn" style="padding:10px; background:#ffd1d1; border:1px solid #fca5a5; border-radius:4px; cursor:pointer;" onclick="calcClear(\'' + winId + '\')">C</button>' +
                '<button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'/\')">/</button>' +
                '<button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'*\')">x</button>' +
                '<button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'-\')">-</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'7\')">7</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'8\')">8</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'9\')">9</button>' +
                '<button class="calc-btn" style="padding:10px; background:#e0e0e0; border:1px solid #ccc; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'+\')">+</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'4\')">4</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'5\')">5</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'6\')">6</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'.\')">.</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'1\')">1</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'2\')">2</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer;" onclick="calcPress(\'' + winId + '\', \'3\')">3</button>' +
                '<button class="calc-btn" style="padding:10px; background:#d1e8ff; border:1px solid #a5ccfc; border-radius:4px; cursor:pointer;" onclick="calcEvaluate(\'' + winId + '\')">=</button>' +
                '<button class="calc-btn" style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:4px; cursor:pointer; grid-column:span 4;" onclick="calcPress(\'' + winId + '\', \'0\')">0</button>' +
            '</div>' +
        '</div>';
    }

    if (appName === 'Browser') {
        var frameId = 'browser-frame-' + winId;
        return '<div style="height:100%; display:flex; flex-direction:column;">' +
            '<div style="display:flex; padding:8px; background:#f1f3f4; border-bottom:1px solid #ccc; align-items:center; gap:10px;">' +
                '<div style="display:flex; gap:5px;">' +
                    '<button style="border:none; background:transparent; cursor:pointer; font-size:16px;">⬅️</button>' +
                    '<button style="border:none; background:transparent; cursor:pointer; font-size:16px;">➡️</button>' +
                    '<button style="border:none; background:transparent; cursor:pointer; font-size:16px;" onclick="document.getElementById(\'' + frameId + '\').src = document.getElementById(\'' + frameId + '-input\').value">🔄</button>' +
                '</div>' +
                '<input id="' + frameId + '-input" type="text" value="https://en.wikipedia.org" style="flex:1; padding:6px 12px; border-radius:15px; border:1px solid #ddd; outline:none;" onkeydown="if(event.key===\'Enter\'){ var url=this.value; if(url.indexOf(\'http\')!==0) url=\'https://\'+url; document.getElementById(\'' + frameId + '\').src=url; this.value=url; }">' +
            '</div>' +
            '<iframe id="' + frameId + '" src="https://en.wikipedia.org/wiki/Special:Random" style="flex:1; width:100%; border:none;"></iframe>' +
        '</div>';
    }

    if (appName === 'TicTacToe') {
        var gid = 'ttt-' + winId;

        // Build the 3x3 grid of clickable cells
        var gridRows = '';
        for (var gr = 0; gr < 3; gr++) {
            gridRows += '<div class="ttt-row">';
            for (var gc = 0; gc < 3; gc++) {
                gridRows += '<div class="ttt-cell" id="' + gid + '-c' + gr + gc + '" onclick="tttCellClick(\'' + gid + '\', ' + gr + ', ' + gc + ')"></div>';
            }
            gridRows += '</div>';
        }

        return '<div id="' + gid + '" style="height:100%; display:flex; flex-direction:column; background:#2c3e50; font-family:Segoe UI,sans-serif; position:relative;">' +
            '<div style="text-align:center; padding:15px 0 5px;">' +
                '<span style="font-family:Georgia,serif; font-size:2em; color:#c0392b; font-weight:bold;">Tic </span>' +
                '<span style="font-family:Georgia,serif; font-size:2em; color:#c0392b; font-weight:bold;">Tac </span>' +
                '<span style="font-family:Georgia,serif; font-size:2.2em; color:#c0392b; font-weight:bold;">Toe</span>' +
            '</div>' +
            // Mark selection screen (X or O)
            '<div id="' + gid + '-config" style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;">' +
                '<h2 style="color:#fff; font-size:1.5em; margin-bottom:20px;">Choose your mark</h2>' +
                '<div style="display:flex; gap:10px;">' +
                    '<div class="ttt-cell ttt-pick" onclick="tttPickMark(\'' + gid + '\', \'X\')">X</div>' +
                    '<div class="ttt-cell ttt-pick" onclick="tttPickMark(\'' + gid + '\', \'O\')">O</div>' +
                '</div>' +
            '</div>' +
            // Game grid (hidden until mark is chosen)
            '<div id="' + gid + '-grid" style="flex:1; display:none; flex-direction:column; align-items:center; justify-content:center;">' +
                gridRows +
                '<div id="' + gid + '-threat" style="font-family:Georgia,serif; font-size:1.1em; margin-top:12px; color:#c0392b; min-height:24px;"></div>' +
            '</div>' +
            // Game over overlay (shown after win/draw)
            '<div id="' + gid + '-gameover" style="position:absolute; top:0; left:0; right:0; bottom:0; background:#2c3e50; display:none; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:20px;">' +
                '<h2 id="' + gid + '-endtitle" style="color:#fff; font-size:1.6em; margin:10px;"></h2>' +
                '<h3 id="' + gid + '-endsub" style="color:#ccc; font-size:1.1em; margin:10px; font-weight:normal;"></h3>' +
                '<button class="ttt-btn" onclick="tttResetGame(\'' + gid + '\')">&#8634; Play again</button>' +
            '</div>' +
        '</div>';
    }

    /* -- Quiz -- */
    if (appName === 'Quiz') {
        var qid = 'quiz-' + winId;
        return '<div id="' + qid + '" style="height:100%; display:flex; flex-direction:column; background:#f0e6f6; font-family:Segoe UI,sans-serif;">' +
            '<div style="background:#8e44ad; color:#fff; padding:12px 20px; font-size:16px; font-weight:600; flex-shrink:0;">🧠 Knowledge Quiz</div>' +
            '<div style="flex:1; display:flex; flex-direction:column; align-items:center; padding:20px; overflow-y:auto;">' +
                '<div id="' + qid + '-question" style="font-size:18px; font-weight:600; color:#2c3e50; text-align:center; margin-bottom:20px;"></div>' +
                '<div id="' + qid + '-options" style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:400px;"></div>' +
                '<div id="' + qid + '-result" style="margin-top:12px; font-size:15px; font-weight:600; min-height:22px;"></div>' +
                '<div id="' + qid + '-score" style="margin-top:4px; font-size:13px; color:#666;"></div>' +
                '<button id="' + qid + '-next" style="display:none; margin-top:10px; padding:8px 24px; background:#8e44ad; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer; flex-shrink:0;" onclick="quizNext(\'' + qid + '\')">Next Question</button>' +
            '</div>' +
        '</div>';
    }

    /* -- Typing Speed Test -- */
    if (appName === 'Typing') {
        var tid = 'type-' + winId;
        return '<div id="' + tid + '" style="height:100%; display:flex; flex-direction:column; background:#eaf2f8; font-family:Segoe UI,sans-serif;">' +
            '<div style="background:#2980b9; color:#fff; padding:12px 20px; font-size:16px; font-weight:600;">⌨️ Typing Speed Test</div>' +
            '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;">' +
                '<div id="' + tid + '-stats" style="display:flex; gap:30px; margin-bottom:20px;">' +
                    '<div style="text-align:center;"><div id="' + tid + '-wpm" style="font-size:32px; font-weight:700; color:#2980b9;">0</div><div style="font-size:12px; color:#888;">WPM</div></div>' +
                    '<div style="text-align:center;"><div id="' + tid + '-acc" style="font-size:32px; font-weight:700; color:#27ae60;">100%</div><div style="font-size:12px; color:#888;">Accuracy</div></div>' +
                    '<div style="text-align:center;"><div id="' + tid + '-time" style="font-size:32px; font-weight:700; color:#e67e22;">30</div><div style="font-size:12px; color:#888;">Seconds</div></div>' +
                '</div>' +
                '<div id="' + tid + '-text" style="font-size:18px; line-height:1.8; color:#7f8c8d; max-width:500px; text-align:center; margin-bottom:15px; min-height:60px;"></div>' +
                '<input id="' + tid + '-input" type="text" style="width:100%; max-width:500px; padding:12px; font-size:16px; border:2px solid #bdc3c7; border-radius:8px; outline:none; text-align:center;" placeholder="Start typing here..." oninput="typingInput(\'' + tid + '\')" autocomplete="off">' +
                '<button style="margin-top:15px; padding:8px 24px; background:#2980b9; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer;" onclick="typingReset(\'' + tid + '\')">Restart</button>' +
            '</div>' +
        '</div>';
    }

    if (appName === 'Explorer') {
        return '<div id="' + winId + '-content" style="flex:1; width:100%; background:#fff; display:flex; flex-direction:column;">Loading Explorer...</div>';
    }

    /* -- Spotify Player -- */
    if (appName === 'Spotify') {
        var spotFrameId = winId + '-spot-frame';
        return '<div style="height:100%; display:flex; flex-direction:column; background:#121212;">' +
            '<div class="no-select" style="display:flex; padding:8px 12px; background:#000; border-bottom:1px solid #282828; justify-content:space-between; align-items:center;">' +
                '<span style="color:#1ed760; font-weight:bold; font-family:sans-serif; font-size:14px;">Spotify Player</span>' +
                '<input type="text" id="' + winId + '-spot-input" placeholder="Paste Spotify link & press Enter" style="flex:1; max-width:250px; margin-left:15px; padding:4px 10px; border-radius:15px; border:1px solid #333; background:#282828; color:#fff; outline:none; font-size:12px;" onkeydown="handleSpotifyInput(event, \'' + spotFrameId + '\')">' +
            '</div>' +
            '<iframe id="' + spotFrameId + '" data-testid="embed-iframe" style="border-radius:0; flex:1;" src="https://open.spotify.com/embed/playlist/3LKe31Lz04waHxvApGwgok?utm_source=generator" width="100%" height="100%" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>' +
        '</div>';
    }

    /* -- Fallback for unknown apps -- */
    return '<div style="padding:20px; text-align:center;">' +
        '<h4>Welcome to ' + appName + '</h4>' +
        '<p style="color:#666;">This app is currently under construction.</p>' +
    '</div>';
}

// ========== Spotify URL Handler ==========
function handleSpotifyInput(e, frameId) {
    if (e.key !== 'Enter') return;

    var val = e.target.value.trim();
    var embedUrl = val;

    if (val.indexOf('spotify.com') > -1) {
        // Full Spotify URL — strip internationalization prefix and convert to embed
        try {
            var urlObj = new URL(val);
            var path = urlObj.pathname;
            var intlMatch = path.match(/\/intl-[a-z]{2}\//);
            if (intlMatch) {
                path = path.replace(intlMatch[0].slice(0, -1), '');
            }
            embedUrl = 'https://open.spotify.com/embed' + path + '?utm_source=generator';
        } catch (ex) { /* invalid URL, use as-is */ }

    } else if (val.indexOf('http') !== 0 && val.length > 5) {
        // Bare playlist/track ID — assume playlist
        embedUrl = 'https://open.spotify.com/embed/playlist/' + val + '?utm_source=generator';
    }

    document.getElementById(frameId).src = embedUrl;
}

// ========== Tic Tac Toe ==========
var tttGames = {};

var tttThreats = [
    'Prepare to suffer extreme humiliation!',
    'I will destroy you!',
    'I am invincible!',
    'You cannot defeat me!',
    'You will be annihilated!',
    'You will fail!',
    'Fear me!',
    'Vengeance is mine!',
    'I hunger!'
];

function tttPickMark(gid, mark) {
    var g = {
        board: [[null, null, null], [null, null, null], [null, null, null]],
        playerMark: mark,
        aiMark: mark === 'X' ? 'O' : 'X',
        turnsPlayed: 0,
        playerTurn: true,
        nextMove: [null, null],
        winner: '',
        gameOver: false
    };
    tttGames[gid] = g;

    var config = document.getElementById(gid + '-config');
    var grid = document.getElementById(gid + '-grid');
    if (config) config.style.display = 'none';
    if (grid) grid.style.display = 'flex';

    // If player chose O, AI goes first (X always starts)
    if (!g.playerTurn) tttAiPlay(gid);
}

function tttCellClick(gid, row, col) {
    var g = tttGames[gid];
    if (!g || !g.playerTurn || g.gameOver) return;
    if (g.board[row][col] !== null) return;
    tttMakePlay(gid, g.playerMark, row, col);
    tttCheckPlay(gid, g.playerMark);
}

function tttMakePlay(gid, mark, row, col) {
    var g = tttGames[gid];
    g.board[row][col] = mark;
    g.turnsPlayed++;

    var cell = document.getElementById(gid + '-c' + row + col);
    if (cell) {
        cell.textContent = mark;
        cell.className = 'ttt-cell ttt-cell-selected';
    }
}

function tttCheckPlay(gid, mark) {
    var g = tttGames[gid];
    if (tttHasWon(gid)) {
        setTimeout(function() { tttGameOver(gid, mark); }, 1500);
    } else if (g.turnsPlayed >= 9) {
        setTimeout(function() { tttGameOver(gid, 'draw'); }, 1500);
    } else {
        g.playerTurn = !g.playerTurn;
        if (!g.playerTurn) tttAiPlay(gid);
    }
}

// AI makes its move using minimax, then displays a trash talk line
function tttAiPlay(gid) {
    setTimeout(function() {
        var g = tttGames[gid];
        if (!g || g.gameOver) return;
        tttMinimax(g, 0);
        tttMakePlay(gid, g.aiMark, g.nextMove[0], g.nextMove[1]);
        tttCheckPlay(gid, g.aiMark);

        // Flash a random trash talk message for 2 seconds
        var threat = document.getElementById(gid + '-threat');
        if (threat) {
            threat.textContent = tttThreats[Math.floor(Math.random() * tttThreats.length)];
            setTimeout(function() { if (threat) threat.textContent = ''; }, 2000);
        }
    }, 600);
}

// Recursive minimax algorithm — finds the optimal move for the AI
// Returns a score: positive favors the player, negative favors the AI
function tttMinimax(state, depth) {
    var gs = JSON.parse(JSON.stringify(state));
    if (gs.gameOver) return tttGetScore(gs, depth);
    depth++;
    var moves = tttAvailableMoves(gs);
    var scores = [];
    for (var i = 0; i < moves.length; i++) {
        var simulated = tttSimulateMove(gs, moves[i]);
        scores.push(tttMinimax(simulated, depth));
    }
    if (gs.playerTurn) {
        var maxIdx = tttFindMaxIdx(scores);
        state.nextMove = moves[maxIdx];
        return scores[maxIdx];
    } else {
        var minIdx = tttFindMinIdx(scores);
        state.nextMove = moves[minIdx];
        return scores[minIdx];
    }
}

// Score a terminal game state (used by minimax)
// Depth penalty ensures the AI prefers faster wins
function tttGetScore(gs, depth) {
    if (gs.winner === gs.playerMark) return 10 - depth;
    if (gs.winner === gs.aiMark) return depth - 10;
    return 0;  // Draw
}

// Return all empty cells as [row, col] pairs
function tttAvailableMoves(gs) {
    var moves = [];
    for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
            if (gs.board[r][c] === null) moves.push([r, c]);
        }
    }
    return moves;
}

// Deep-copy the game state, apply a move, and check for game end
function tttSimulateMove(state, move) {
    var gs = JSON.parse(JSON.stringify(state));
    gs.board[move[0]][move[1]] = gs.playerTurn ? gs.playerMark : gs.aiMark;
    gs.turnsPlayed++;
    if (tttCheckWinState(gs)) {
        gs.gameOver = true;
        gs.winner = gs.playerTurn ? gs.playerMark : gs.aiMark;
    } else if (gs.turnsPlayed >= 9) {
        gs.gameOver = true;
        gs.winner = 'draw';
    } else {
        gs.playerTurn = !gs.playerTurn;
    }
    return gs;
}

// Check if a board state has a three-in-a-row (used by minimax simulation)
function tttCheckWinState(gs) {
    var b = gs.board;
    if (b[0][0] !== null && b[0][0] === b[1][1] && b[1][1] === b[2][2]) return true;
    if (b[0][2] !== null && b[0][2] === b[1][1] && b[1][1] === b[2][0]) return true;
    for (var i = 0; i < 3; i++) {
        if (b[i][0] !== null && b[i][0] === b[i][1] && b[i][1] === b[i][2]) return true;
        if (b[0][i] !== null && b[0][i] === b[1][i] && b[1][i] === b[2][i]) return true;
    }
    return false;
}

// Check for a win on the live board AND trigger the win animation
function tttHasWon(gid) {
    var g = tttGames[gid];
    var b = g.board;
    var win = false;
    if (b[0][0] !== null && b[0][0] === b[1][1] && b[1][1] === b[2][2]) {
        tttWinAnim(gid, [[0, 0], [1, 1], [2, 2]]); win = true;
    } else if (b[0][2] !== null && b[0][2] === b[1][1] && b[1][1] === b[2][0]) {
        tttWinAnim(gid, [[0, 2], [1, 1], [2, 0]]); win = true;
    }

    // Rows
    if (!win) {
        for (var r = 0; r < 3; r++) {
            if (b[r][0] !== null && b[r][0] === b[r][1] && b[r][1] === b[r][2]) {
                tttWinAnim(gid, [[r, 0], [r, 1], [r, 2]]); win = true; break;
            }
        }
    }

    // Columns
    if (!win) {
        for (var c = 0; c < 3; c++) {
            if (b[0][c] !== null && b[0][c] === b[1][c] && b[1][c] === b[2][c]) {
                tttWinAnim(gid, [[0, c], [1, c], [2, c]]); win = true; break;
            }
        }
    }
    return win;
}

// Highlight the winning three cells
function tttWinAnim(gid, cells) {
    for (var i = 0; i < cells.length; i++) {
        var el = document.getElementById(gid + '-c' + cells[i][0] + cells[i][1]);
        if (el) el.className = 'ttt-cell ttt-cell-win';
    }
}

// Show the game over overlay with result message
function tttGameOver(gid, winCase) {
    var g = tttGames[gid];
    g.gameOver = true;
    var overlay = document.getElementById(gid + '-gameover');
    var title   = document.getElementById(gid + '-endtitle');
    var sub     = document.getElementById(gid + '-endsub');

    if (winCase === g.playerMark) {
        title.textContent = 'You have claimed victory.';
        sub.textContent = 'May you bathe in tic-tac-toe glory.';
    } else if (winCase === g.aiMark) {
        title.textContent = 'The computer has claimed victory!';
        sub.textContent = 'May they bathe their circuits in tic-tac-toe glory.';
    } else {
        title.textContent = 'It\'s a draw!';
        sub.textContent = 'Perhaps their feud will be settled in another life...';
    }
    overlay.style.display = 'flex';
}

function tttResetGame(gid) {
    var overlay = document.getElementById(gid + '-gameover');
    var grid    = document.getElementById(gid + '-grid');
    var config  = document.getElementById(gid + '-config');

    overlay.style.display = 'none';
    grid.style.display = 'none';
    config.style.display = 'flex';
    for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
            var cell = document.getElementById(gid + '-c' + r + c);
            if (cell) { cell.textContent = ''; cell.className = 'ttt-cell'; }
        }
    }
    delete tttGames[gid];
}

function tttFindMaxIdx(arr) {
    var idx = 0;
    for (var i = 1; i < arr.length; i++) { if (arr[i] > arr[idx]) idx = i; }
    return idx;
}

function tttFindMinIdx(arr) {
    var idx = 0;
    for (var i = 1; i < arr.length; i++) { if (arr[i] < arr[idx]) idx = i; }
    return idx;
}

// ========== Quiz App ==========
var quizState = {};

function quizDecodeHTML(str) {
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

function quizInit(qid) {
    var qEl = document.getElementById(qid + '-question');
    var oEl = document.getElementById(qid + '-options');
    var rEl = document.getElementById(qid + '-result');
    var nEl = document.getElementById(qid + '-next');
    var sEl = document.getElementById(qid + '-score');
    if (qEl) qEl.textContent = 'Loading questions...';
    if (oEl) oEl.innerHTML = '';
    if (rEl) rEl.textContent = '';
    if (nEl) nEl.style.display = 'none';
    if (sEl) sEl.textContent = '';

    fetch('https://opentdb.com/api.php?amount=10&category=30&type=multiple')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.results || data.results.length === 0) {
                if (qEl) qEl.textContent = 'Failed to load questions. Try again.';
                return;
            }

            // Parse and shuffle each question's answer options
            var questions = [];
            for (var i = 0; i < data.results.length; i++) {
                var item = data.results[i];
                var correct = quizDecodeHTML(item.correct_answer);
                var opts = item.incorrect_answers.map(function(a) { return quizDecodeHTML(a); });

                // Insert the correct answer at a random position
                var correctIdx = Math.floor(Math.random() * (opts.length + 1));
                opts.splice(correctIdx, 0, correct);
                questions.push({ q: quizDecodeHTML(item.question), o: opts, a: correctIdx });
            }
            quizState[qid] = { idx: 0, score: 0, answered: false, questions: questions };
            quizShow(qid);
        })
        .catch(function() {
            if (qEl) qEl.textContent = 'Network error. Check connection and try again.';
        });
}

// Display the current question and its answer buttons
function quizShow(qid) {
    var s = quizState[qid];
    if (!s) return;
    s.answered = false;

    var q     = s.questions[s.idx];
    var total = s.questions.length;
    var qEl   = document.getElementById(qid + '-question');
    var oEl   = document.getElementById(qid + '-options');
    var rEl   = document.getElementById(qid + '-result');
    var nEl   = document.getElementById(qid + '-next');
    var sEl   = document.getElementById(qid + '-score');

    if (qEl) qEl.textContent = (s.idx + 1) + '/' + total + '  ' + q.q;
    if (rEl) { rEl.textContent = ''; rEl.style.color = ''; }
    if (nEl) nEl.style.display = 'none';
    if (sEl) sEl.textContent = 'Score: ' + s.score + '/' + total;

    if (oEl) {
        oEl.innerHTML = '';
        for (var i = 0; i < q.o.length; i++) {
            var btn = document.createElement('button');
            btn.textContent = q.o[i];
            btn.style.cssText = 'padding:12px; background:#fff; border:2px solid #ddd; border-radius:8px; font-size:15px; cursor:pointer; transition:all 0.2s;';
            btn.setAttribute('data-idx', i);
            btn.onclick = (function(idx) { return function() { quizAnswer(qid, idx); }; })(i);
            oEl.appendChild(btn);
        }
    }
}

// Handle the player selecting an answer
function quizAnswer(qid, chosen) {
    var s = quizState[qid];
    if (!s || s.answered) return;
    s.answered = true;

    var q     = s.questions[s.idx];
    var total = s.questions.length;
    var rEl   = document.getElementById(qid + '-result');
    var nEl   = document.getElementById(qid + '-next');
    var sEl   = document.getElementById(qid + '-score');
    var oEl   = document.getElementById(qid + '-options');
    var btns  = oEl ? oEl.children : [];

    // Highlight correct answer green, wrong choice red
    for (var i = 0; i < btns.length; i++) {
        if (i === q.a) { btns[i].style.background = '#27ae60'; btns[i].style.color = '#fff'; btns[i].style.borderColor = '#27ae60'; }
        else if (i === chosen && chosen !== q.a) { btns[i].style.background = '#e74c3c'; btns[i].style.color = '#fff'; btns[i].style.borderColor = '#e74c3c'; }
        btns[i].style.cursor = 'default';
    }

    if (chosen === q.a) {
        s.score++;
        if (rEl) { rEl.textContent = 'Correct! \u2705'; rEl.style.color = '#27ae60'; }
    } else {
        if (rEl) { rEl.textContent = 'Wrong! The answer is: ' + q.o[q.a]; rEl.style.color = '#e74c3c'; }
    }

    if (sEl) sEl.textContent = 'Score: ' + s.score + '/' + total;
    if (nEl) { nEl.style.display = 'inline-block'; nEl.textContent = s.idx < total - 1 ? 'Next Question' : 'See Results'; }
}

// Advance to the next question, or show final results
function quizNext(qid) {
    var s = quizState[qid];
    if (!s) return;

    var total = s.questions.length;
    s.idx++;

    if (s.idx >= total) {
        // Quiz complete — show summary
        var qEl = document.getElementById(qid + '-question');
        var oEl = document.getElementById(qid + '-options');
        var rEl = document.getElementById(qid + '-result');
        var nEl = document.getElementById(qid + '-next');

        if (qEl) qEl.textContent = 'Quiz Complete!';
        if (oEl) oEl.innerHTML = '';

        var pct = Math.round((s.score / total) * 100);
        var msg = pct === 100 ? 'Perfect score! \ud83c\udf1f' : pct >= 70 ? 'Great job! \ud83d\udc4f' : pct >= 50 ? 'Not bad! Keep learning!' : 'Keep studying! \ud83d\udcda';

        if (rEl) { rEl.textContent = 'You scored ' + s.score + '/' + total + ' (' + pct + '%) \u2014 ' + msg; rEl.style.color = '#8e44ad'; }
        if (nEl) { nEl.textContent = 'Play Again'; nEl.onclick = function() { quizInit(qid); }; }
    } else {
        quizShow(qid);
    }
}

// ========== Typing Test App ==========
var typingSentences = [
    'The quick brown fox jumps over the lazy dog',
    'Practice makes perfect in everything you do',
    'A journey of a thousand miles begins with a single step',
    'To be or not to be that is the question',
    'All that glitters is not gold but it sure looks nice',
    'Knowledge is power and learning never stops',
    'The early bird catches the worm every morning',
    'Actions speak louder than words in every situation',
    'Every great dream begins with a dreamer who believes',
    'Innovation distinguishes between a leader and a follower'
];

// Active typing test instances, keyed by element ID
var typingState = {};

// Set up a new typing test with a random sentence
function typingInit(tid) {
    var sentence = typingSentences[Math.floor(Math.random() * typingSentences.length)];
    typingState[tid] = { text: sentence, started: false, startTime: 0, timer: null, timeLeft: 30, correct: 0, total: 0, done: false };

    var textEl  = document.getElementById(tid + '-text');
    var inputEl = document.getElementById(tid + '-input');
    if (textEl)  textEl.innerHTML = '<span style="color:#bdc3c7;">' + sentence + '</span>';
    if (inputEl) { inputEl.value = ''; inputEl.disabled = false; inputEl.focus(); }

    var wpmEl  = document.getElementById(tid + '-wpm');
    var accEl  = document.getElementById(tid + '-acc');
    var timeEl = document.getElementById(tid + '-time');
    if (wpmEl)  wpmEl.textContent = '0';
    if (accEl)  accEl.textContent = '100%';
    if (timeEl) timeEl.textContent = '30';
}

// Called on every keystroke — starts the timer on first input
function typingInput(tid) {
    var s = typingState[tid];
    if (!s || s.done) return;

    var inputEl = document.getElementById(tid + '-input');
    if (!inputEl) return;
    var typed = inputEl.value;

    // Start the countdown timer on the first character typed
    if (!s.started) {
        s.started = true;
        s.startTime = Date.now();
        s.timer = setInterval(function() { typingTick(tid); }, 1000);
    }

    // Color-code each character: green = correct, red = wrong, gray = not yet typed
    var textEl = document.getElementById(tid + '-text');
    var html = '';
    s.correct = 0;
    s.total = typed.length;

    for (var i = 0; i < s.text.length; i++) {
        if (i < typed.length) {
            if (typed[i] === s.text[i]) {
                html += '<span style="color:#27ae60;">' + s.text[i] + '</span>';
                s.correct++;
            } else {
                html += '<span style="color:#e74c3c; text-decoration:underline;">' + s.text[i] + '</span>';
            }
        } else {
            html += '<span style="color:#bdc3c7;">' + s.text[i] + '</span>';
        }
    }
    if (textEl) textEl.innerHTML = html;

    // Update accuracy display
    var acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 100;
    var accEl = document.getElementById(tid + '-acc');
    if (accEl) accEl.textContent = acc + '%';

    // Calculate and display words per minute
    var elapsed = (Date.now() - s.startTime) / 60000;   // minutes
    var words = s.correct / 5;                            // standard: 5 chars = 1 word
    var wpm = elapsed > 0 ? Math.round(words / elapsed) : 0;
    var wpmEl = document.getElementById(tid + '-wpm');
    if (wpmEl) wpmEl.textContent = wpm;

    // Auto-finish if the entire sentence has been typed
    if (typed.length >= s.text.length) {
        typingFinish(tid);
    }
}

// Countdown timer — ticks once per second
function typingTick(tid) {
    var s = typingState[tid];
    if (!s) return;
    s.timeLeft--;

    var timeEl = document.getElementById(tid + '-time');
    if (timeEl) timeEl.textContent = s.timeLeft;

    if (s.timeLeft <= 0) typingFinish(tid);
}

// End the test — disable input and stop the timer
function typingFinish(tid) {
    var s = typingState[tid];
    if (!s || s.done) return;
    s.done = true;
    clearInterval(s.timer);

    var inputEl = document.getElementById(tid + '-input');
    if (inputEl) inputEl.disabled = true;
}

// Restart button — clear the timer and reinitialize
function typingReset(tid) {
    var s = typingState[tid];
    if (s && s.timer) clearInterval(s.timer);
    typingInit(tid);
}

// ========== Calculator ==========
function calcPress(winId, value) {
    var display = document.getElementById('calc-display-' + winId);
    if (!display) return;
    display.value += value;
}

// Clear the calculator display
function calcClear(winId) {
    var display = document.getElementById('calc-display-' + winId);
    if (!display) return;
    display.value = '';
}

// Evaluate the expression in the display using strict-mode Function
function calcEvaluate(winId) {
    var display = document.getElementById('calc-display-' + winId);
    if (!display) return;
    try {
        var result = Function('"use strict"; return (' + display.value + ')')();
        display.value = Number.isFinite(result) ? String(result) : 'Error';
    } catch (err) {
        display.value = 'Error';
    }
}

// ========== Taskbar ==========
function addTaskbarIcon(winId, iconPath) {
    var container = document.getElementById('taskbar-apps');
    var iconDiv = document.createElement('div');
    iconDiv.className = 'task-item';
    iconDiv.id = 'task-' + winId;
    iconDiv.innerHTML = '<img src="' + iconPath + '">';

    // Click to restore a minimized window or bring it to the front
    iconDiv.onclick = function() {
        var win = document.getElementById(winId);
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

// Hide the window (minimized to the taskbar)
function minimizeApp(winId) {
    var win = document.getElementById(winId);
    if (!win) return;
    win.style.display = 'none';
    win.dataset.minimized = 'true';
}

// Toggle between maximized (full desktop) and restored (original size)
function toggleMaximize(winId) {
    var win = document.getElementById(winId);
    if (!win) return;

    if (win.dataset.maximized !== 'true') {
        // Save current position/size, then go full screen
        win.dataset.prevLeft   = win.style.left;
        win.dataset.prevTop    = win.style.top;
        win.dataset.prevWidth  = win.style.width;
        win.dataset.prevHeight = win.style.height;

        win.style.left   = '0px';
        win.style.top    = '0px';
        win.style.width  = '100%';
        win.style.height = 'calc(100% - 40px)';   // Leave room for the taskbar
        win.dataset.maximized = 'true';
    } else {
        // Restore to previous position/size
        win.style.left   = win.dataset.prevLeft   || '120px';
        win.style.top    = win.dataset.prevTop     || '50px';
        win.style.width  = win.dataset.prevWidth   || '550px';
        win.style.height = win.dataset.prevHeight  || '400px';
        win.dataset.maximized = 'false';
    }
}

// Remove the window and its taskbar icon from the DOM
function closeApp(winId) {
    var win = document.getElementById(winId);
    var taskIcon = document.getElementById('task-' + winId);
    if (win) win.remove();
    if (taskIcon) taskIcon.remove();
}

// ========== Draggable Windows ==========
function makeDraggable(e, winId) {
    var windowEl = document.getElementById(winId);
    e.preventDefault();
    document.body.classList.add('no-select');

    // Calculate the offset between the mouse and the window's top-left corner
    var offsetX = e.clientX - windowEl.offsetLeft;
    var offsetY = e.clientY - windowEl.offsetTop;

    function moveWindow(event) {
        if (windowEl.dataset.maximized === 'true') return;
        windowEl.style.left = (event.clientX - offsetX) + 'px';
        windowEl.style.top  = (event.clientY - offsetY) + 'px';
    }

    function stopDragging() {
        document.body.classList.remove('no-select');
        window.removeEventListener('mousemove', moveWindow);
        window.removeEventListener('mouseup', stopDragging);
    }

    window.addEventListener('mousemove', moveWindow);
    window.addEventListener('mouseup', stopDragging);
}

// ========== System UI ==========

// Update the lock screen's time and date display
function updateLockClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    if (m < 10) m = '0' + m;

    var days   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    var lockTime = document.getElementById('lockTime');
    var lockDate = document.getElementById('lockDate');
    if (lockTime) lockTime.textContent = h + ':' + m;
    if (lockDate) lockDate.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
}

// Start the lock screen clock immediately and update every second
updateLockClock();
setInterval(updateLockClock, 1000);

// Unlock animation: slide up and fade out, then hide completely
function handleLockClick() {
    var lock = document.getElementById('lockScreen');
    if (!lock) return;
    lock.classList.add('unlocking');
    setTimeout(function() { lock.style.display = 'none'; }, 500);
}

// Start menu: toggle on button click, close on any outside click
document.getElementById('startBtn').onclick = function(e) {
    e.stopPropagation();
    document.getElementById('startMenu').classList.toggle('hidden');
};

document.onclick = function() {
    document.getElementById('startMenu').classList.add('hidden');
};

// Taskbar clock: update the time display every second
function updateClock() {
    var now = new Date();
    var hours   = now.getHours();
    var minutes = now.getMinutes();
    if (minutes < 10) minutes = '0' + minutes;
    document.getElementById('clock').innerText = hours + ':' + minutes;
}

setInterval(updateClock, 1000);
updateClock();
