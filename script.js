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
                            'Desktop': { type: 'dir', children: { 'anupsharma12.com.np.lnk': { type: 'file', content: 'link' } } },
                            'Documents': { type: 'dir', children: { 'notes.txt': { type: 'file', content: 'Welcome to WinOS Explorer!\n\nThis is a fully functional virtual file system.\nTry using the Terminal to navigate here and read this file.' } } },
                            'Downloads': { type: 'dir', children: { 'installer.exe': { type: 'file', content: '[binary data]' }, 'Cheats++.exe': { type: 'file', content: '[binary data]' } } },
                            'Pictures': { type: 'dir', children: { 'wallpaper.jpg': { type: 'file', content: '[image data]' } } },
                            'Music': { type: 'dir', children: { 'playlist.m3u': { type: 'file', content: '[playlist]' } } },
                            'Videos': { type: 'dir', children: {} },
                            'Projects': {
                                type: 'dir', children: {
                                    'TicTacToe.lnk': { type: 'file', content: 'link' },
                                    'Typing.lnk': { type: 'file', content: 'link' },
                                    'Quiz.lnk': { type: 'file', content: 'link' },
                                    'Snake.lnk': { type: 'file', content: 'link' }
                                }
                            }
                        }
                    }
                }
            },
            'WinOS': { type: 'dir', children: { 'System32': { type: 'dir', children: {} } } }
        }
    }
};


/* -- VFS global state -- */
var currentVfsPath = 'C:\\Users\\Anup';
var terminalPath = 'C:\\Users\\Anup';
var winCount = 0;
var topZ = 100;
var wallpaperChoices = [];

// Set your new default wallpaper here
var activeWallpaper = 'img/wallpapers/1.jpg';

for (var wallpaperIndex = 1; wallpaperIndex <= 8; wallpaperIndex++) {
    wallpaperChoices.push('img/wallpapers/' + wallpaperIndex + '.jpg');
}


/* -- Path conversion helpers -- */

// Convert forward slashes to backslashes (Unix -> Windows style)
function toWinPath(p) {
    return p.replace(/\//g, '\\');
}

function toUnixPath(p) {
    return p.replace(/\\/g, '/');
}

function getChildKey(parent, name) {
    if (!parent || parent.type !== 'dir' || !parent.children) return null;
    if (parent.children[name]) return name;

    var keys = Object.keys(parent.children);
    var needle = name.toLowerCase();
    for (var i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase() === needle) return keys[i];
    }
    return null;
}

function getChildNode(parent, name) {
    var key = getChildKey(parent, name);
    return key ? parent.children[key] : null;
}

function getVfsNode(winPath) {
    var parts = toUnixPath(winPath).split('/').filter(function (p) { return p !== ''; });
    if (parts.length === 0) return null;
    var root = parts[0];
    if (root === 'C:' && VFS['C:']) {
        var node = VFS['C:'];
        for (var i = 1; i < parts.length; i++) {
            node = getChildNode(node, parts[i]);
            if (!node) return null;
        }
        return node;
    }
    return null;
}

function normalizeVfsPath(winPath) {
    var parts = toUnixPath(winPath).split('/').filter(function (p) { return p !== ''; });
    if (parts.length === 0) return winPath;
    if (parts[0] !== 'C:' || !VFS['C:']) return winPath;

    var node = VFS['C:'];
    var out = ['C:'];
    for (var i = 1; i < parts.length; i++) {
        var key = getChildKey(node, parts[i]);
        if (!key) break;
        out.push(key);
        node = node.children[key];
    }
    return toWinPath(out.join('/'));
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

// ========== Explorer (Win11 Faithful Clone) ==========

// Explorer state
var explorerHistory = [];
var explorerHistoryIdx = -1;
var explorerViewMode = 'medium'; // 'medium', 'large', 'details'
var explorerSelectedItems = [];
var explorerClipboard = null; // { mode: 'copy'|'cut', path: '', names: [] }

function explorerPushHistory(path) {
    if (explorerHistory[explorerHistoryIdx] === path) return;
    explorerHistory.splice(explorerHistoryIdx + 1);
    explorerHistory.push(path);
    explorerHistoryIdx = explorerHistory.length - 1;
}

// Special folder icon mapping
var folderIconMap = {
    'Desktop': 'desk',
    'Documents': 'docs',
    'Downloads': 'down',
    'Pictures': 'pics',
    'Music': 'music',
    'Videos': 'vid',
    'OneDrive': 'onedrive',
    'This PC': 'thispc',
    'Quick access': 'star',
    'Home': 'user'
};

// Icon mapping for file types
function getFileIconHTML(name, isDir, size) {
    size = size || 48;
    if (isDir) {
        var folderImg = folderIconMap[name] || 'folder';
        return '<img class="exp-file-icon" src="./img/icon/win/' + folderImg + '.png" width="' + size + '" height="' + size + '">';
    }
    var ext = name.split('.').pop().toLowerCase();
    var iconMap = {
        'txt': 'docs', 'doc': 'docs', 'docx': 'docs', 'pdf': 'docs',
        'jpg': 'pics', 'jpeg': 'pics', 'png': 'pics', 'gif': 'pics', 'bmp': 'pics', 'svg': 'pics',
        'mp3': 'music', 'wav': 'music', 'flac': 'music', 'ogg': 'music', 'm3u': 'music',
        'mp4': 'vid', 'avi': 'vid', 'mkv': 'vid', 'mov': 'vid', 'wmv': 'vid'
    };
    if (iconMap[ext]) return '<img class="exp-file-icon" src="./img/icon/win/' + iconMap[ext] + '.png" width="' + size + '" height="' + size + '">';
    if (ext === 'exe') return '<span class="material-symbols-rounded" style="font-size:' + size + 'px; color:#0078d4;">deployed_code</span>';
    if (ext === 'lnk') return '<span class="material-symbols-rounded" style="font-size:' + size + 'px; color:#666;">link</span>';
    return '<img class="exp-file-icon" src="./img/icon/win/docs.png" width="' + size + '" height="' + size + '">';
}

// Small icon for navpane/details (18px)
function getSmallIcon(name, isDir) {
    if (isDir) {
        var folderImg = folderIconMap[name] || 'folder';
        return '<img src="./img/icon/win/' + folderImg + '-sm.png" onerror="this.src=\'./img/icon/win/folder-sm.png\'" width="18" height="18">';
    }
    return getFileIconHTML(name, false, 18);
}

// Build breadcrumb path segments
function buildBreadcrumb(path, winId) {
    var parts = path.replace(/\//g, '\\').split('\\').filter(function(p) { return p !== ''; });
    var html = '';
    // Map display names for special paths
    var displayNames = { 'C:': 'Local Disk (C:)', 'Users': 'Users' };

    var pathSoFar = '';
    for (var i = 0; i < parts.length; i++) {
        if (i > 0) html += '<span class="explorer-bc-sep"><span class="material-symbols-rounded">chevron_right</span></span>';
        pathSoFar += (i === 0 ? '' : '\\') + parts[i];
        var display = displayNames[parts[i]] || parts[i];
        var escapedP = pathSoFar.replace(/\\/g, '\\\\');
        html += '<span class="explorer-bc-seg" onclick="window.vfsState.goTo(\'' + winId + '\',\'' + escapedP + '\')">' + display + '</span>';
    }
    return html;
}

// Get icon for the address bar breadcrumb based on current path
function getAddressBarIcon(path) {
    var lastPart = path.split('\\').filter(function(p) { return p !== ''; }).pop();
    if (lastPart && folderIconMap[lastPart]) return './img/icon/win/' + folderIconMap[lastPart] + '-sm.png';
    if (path === 'C:') return './img/icon/win/disk-sm.png';
    return './img/icon/win/folder-sm.png';
}

// Build navigation pane (sidebar tree)
function buildNavItem(icon, label, path, winId, opts) {
    opts = opts || {};
    var isActive = currentVfsPath === path;
    var hasChildren = false;
    if (path) {
        var node = getVfsNode(path);
        if (node && node.type === 'dir') {
            var childKeys = Object.keys(node.children);
            for (var k = 0; k < childKeys.length; k++) {
                if (node.children[childKeys[k]].type === 'dir') { hasChildren = true; break; }
            }
        }
    }

    var arrowClass = 'exp-arrow' + (hasChildren ? '' : ' invisible') + (opts.open ? ' rotated' : '');
    var titleClass = 'exp-droptitle' + (isActive ? ' active' : '');
    var escapedPath = path ? path.replace(/\\/g, '\\\\') : '';

    var html = '<div class="exp-dropdown">';
    html += '<div class="' + titleClass + '" onclick="window.vfsState.goTo(\'' + winId + '\', \'' + escapedPath + '\')">';

    if (hasChildren) {
        html += '<span class="' + arrowClass + '" onclick="event.stopPropagation(); explorerToggleTree(this, \'' + winId + '\', \'' + escapedPath + '\')">&#9654;</span>';
    } else {
        html += '<span class="exp-arrow invisible">&#9654;</span>';
    }

    html += '<img class="exp-nav-icon" src="./img/icon/win/' + icon + '-sm.png" onerror="this.src=\'./img/icon/win/folder-sm.png\'">';
    html += '<span class="exp-nav-label">' + label + '</span>';

    if (opts.pinned) {
        html += '<span class="material-symbols-rounded exp-pin-icon" style="font-size:12px;">push_pin</span>';
    }

    html += '</div>';

    if (opts.open && hasChildren) {
        html += '<div class="exp-dropcontent">';
        var node = getVfsNode(path);
        var keys = Object.keys(node.children);
        for (var c = 0; c < keys.length; c++) {
            if (node.children[keys[c]].type === 'dir') {
                var childIcon = folderIconMap[keys[c]] || 'folder';
                html += buildNavItem(childIcon, keys[c], path + '\\' + keys[c], winId, {});
            }
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function explorerToggleTree(arrowEl, winId, path) {
    var dropdown = arrowEl.closest('.exp-dropdown');
    var content = dropdown.querySelector(':scope > .exp-dropcontent');

    if (content) {
        content.remove();
        arrowEl.classList.remove('rotated');
    } else {
        arrowEl.classList.add('rotated');
        var node = getVfsNode(path);
        if (node && node.type === 'dir') {
            var newContent = document.createElement('div');
            newContent.className = 'exp-dropcontent';
            var keys = Object.keys(node.children);
            for (var c = 0; c < keys.length; c++) {
                if (node.children[keys[c]].type === 'dir') {
                    var childIcon = folderIconMap[keys[c]] || 'folder';
                    newContent.innerHTML += buildNavItem(childIcon, keys[c], path + '\\' + keys[c], winId, {});
                }
            }
            dropdown.appendChild(newContent);
        }
    }
}

// Close any open context menu
function closeExplorerContextMenu() {
    var old = document.querySelector('.explorer-ctx-menu');
    if (old) old.remove();
}

// Context menu for right-click
function showExplorerContextMenu(e, winId, itemName) {
    e.preventDefault();
    e.stopPropagation();
    closeExplorerContextMenu();

    var menu = document.createElement('div');
    menu.className = 'explorer-ctx-menu';

    if (itemName) {
        // File/folder context menu
        var isDir = false;
        var node = getVfsNode(currentVfsPath);
        if (node && node.children && node.children[itemName] && node.children[itemName].type === 'dir') isDir = true;

        if (isDir) {
            menu.innerHTML =
                '<div class="explorer-ctx-item" onclick="window.vfsState.open(\'' + winId + '\',\'' + itemName.replace(/'/g, "\\'") + '\'); closeExplorerContextMenu()"><span class="material-symbols-rounded">folder_open</span>Open</div>' +
                '<div class="explorer-ctx-sep"></div>';
        }
        menu.innerHTML +=
            '<div class="explorer-ctx-item" onclick="explorerCut(\'' + winId + '\',\'' + itemName.replace(/'/g, "\\'") + '\')"><img src="./img/icon/ui/cut.png">Cut</div>' +
            '<div class="explorer-ctx-item" onclick="explorerCopy(\'' + winId + '\',\'' + itemName.replace(/'/g, "\\'") + '\')"><img src="./img/icon/ui/copy.png">Copy</div>' +
            '<div class="explorer-ctx-sep"></div>' +
            '<div class="explorer-ctx-item" onclick="explorerRename(\'' + winId + '\',\'' + itemName.replace(/'/g, "\\'") + '\')"><img src="./img/icon/ui/rename.png">Rename</div>' +
            '<div class="explorer-ctx-item" onclick="explorerDelete(\'' + winId + '\',\'' + itemName.replace(/'/g, "\\'") + '\')"><span class="material-symbols-rounded" style="color:#c42b1c;">delete</span>Delete</div>';
    } else {
        // Background context menu
        menu.innerHTML =
            '<div class="explorer-ctx-item" onclick="window.vfsState.newFolder(\'' + winId + '\'); closeExplorerContextMenu()"><img src="./img/icon/ui/new.png">New folder</div>' +
            '<div class="explorer-ctx-item" onclick="explorerNewFile(\'' + winId + '\'); closeExplorerContextMenu()"><span class="material-symbols-rounded">note_add</span>New text document</div>' +
            '<div class="explorer-ctx-sep"></div>';
        if (explorerClipboard) {
            menu.innerHTML += '<div class="explorer-ctx-item" onclick="explorerPaste(\'' + winId + '\'); closeExplorerContextMenu()"><img src="./img/icon/ui/paste.png">Paste</div>' +
                '<div class="explorer-ctx-sep"></div>';
        }
        menu.innerHTML +=
            '<div class="explorer-ctx-item" onclick="window.vfsState.renderExplorer(\'' + winId + '\'); closeExplorerContextMenu()"><span class="material-symbols-rounded">refresh</span>Refresh</div>' +
            '<div class="explorer-ctx-sep"></div>' +
            '<div class="explorer-ctx-item" onclick="closeExplorerContextMenu()"><span class="material-symbols-rounded">info</span>Properties</div>';
    }

    // Position menu near cursor but within viewport
    document.body.appendChild(menu);
    var x = e.clientX, y = e.clientY;
    if (x + menu.offsetWidth > window.innerWidth) x = window.innerWidth - menu.offsetWidth - 4;
    if (y + menu.offsetHeight > window.innerHeight) y = window.innerHeight - menu.offsetHeight - 4;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

// Clipboard operations
function explorerCut(winId, name) {
    explorerClipboard = { mode: 'cut', path: currentVfsPath, names: [name] };
    closeExplorerContextMenu();
}

function explorerCopy(winId, name) {
    explorerClipboard = { mode: 'copy', path: currentVfsPath, names: [name] };
    closeExplorerContextMenu();
}

function explorerPaste(winId) {
    if (!explorerClipboard) return;
    var srcParent = getVfsNode(explorerClipboard.path);
    var dstParent = getVfsNode(currentVfsPath);
    if (!srcParent || !dstParent || dstParent.type !== 'dir') return;

    for (var i = 0; i < explorerClipboard.names.length; i++) {
        var n = explorerClipboard.names[i];
        if (!srcParent.children[n]) continue;
        var newName = n;
        if (dstParent.children[newName] && explorerClipboard.mode === 'copy') {
            newName = n + ' - Copy';
        }
        dstParent.children[newName] = JSON.parse(JSON.stringify(srcParent.children[n]));
        if (explorerClipboard.mode === 'cut') {
            delete srcParent.children[n];
        }
    }
    if (explorerClipboard.mode === 'cut') explorerClipboard = null;
    window.vfsState.renderExplorer(winId);
}

function explorerRename(winId, name) {
    closeExplorerContextMenu();
    var newName = prompt('Rename to:', name);
    if (!newName || newName === name) return;
    var parent = getVfsNode(currentVfsPath);
    if (!parent || !parent.children[name]) return;
    if (parent.children[newName]) { alert('An item with that name already exists.'); return; }
    parent.children[newName] = parent.children[name];
    delete parent.children[name];
    window.vfsState.renderExplorer(winId);
}

function explorerDelete(winId, name) {
    closeExplorerContextMenu();
    var parent = getVfsNode(currentVfsPath);
    if (!parent || !parent.children[name]) return;
    delete parent.children[name];
    window.vfsState.renderExplorer(winId);
}

function explorerNewFile(winId) {
    var parent = getVfsNode(currentVfsPath);
    if (!parent || parent.type !== 'dir') return;
    var name = 'New Text Document.txt';
    var idx = 1;
    while (parent.children[name]) { name = 'New Text Document (' + idx + ').txt'; idx++; }
    parent.children[name] = { type: 'file', content: '' };
    window.vfsState.renderExplorer(winId);
}

// Select a file item
function explorerSelectItem(el, name, e) {
    if (!e.ctrlKey) {
        // Deselect all
        var items = el.closest('.explorer-content-wrap').querySelectorAll('.explorer-file-item.selected, .explorer-details-row.selected');
        for (var i = 0; i < items.length; i++) items[i].classList.remove('selected');
        explorerSelectedItems = [];
    }
    el.classList.toggle('selected');
    var idx = explorerSelectedItems.indexOf(name);
    if (idx >= 0) explorerSelectedItems.splice(idx, 1);
    else explorerSelectedItems.push(name);
}

// Format date for details view
function formatFileDate() {
    var d = new Date();
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' +
        (d.getHours() % 12 || 12) + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + ' ' + (d.getHours() >= 12 ? 'PM' : 'AM');
}

function getFileType(name, isDir) {
    if (isDir) return 'File folder';
    var ext = name.split('.').pop().toLowerCase();
    var types = { 'txt': 'Text Document', 'doc': 'Document', 'exe': 'Application', 'lnk': 'Shortcut',
        'jpg': 'JPEG Image', 'png': 'PNG Image', 'mp3': 'MP3 Audio', 'mp4': 'MP4 Video',
        'm3u': 'Playlist File', 'pdf': 'PDF Document' };
    return types[ext] || (ext.toUpperCase() + ' File');
}

window.vfsState = {
    renderExplorer: function (winId) {
        if (explorerHistoryIdx < 0) explorerPushHistory(currentVfsPath);

        var node = getVfsNode(currentVfsPath);

        // ---- Command Bar (Ribbon) ----
        var ribbon = '<div class="explorer-ribbon">' +
            '<div class="explorer-ribbon-sec">' +
            '<button class="explorer-ribbon-btn primary" onclick="window.vfsState.newFolder(\'' + winId + '\')" title="New folder"><img src="./img/icon/ui/new.png"><span>New</span></button>' +
            '</div>' +
            '<div class="explorer-ribbon-sec">' +
            '<button class="explorer-ribbon-btn" onclick="explorerCut(\'' + winId + '\', explorerSelectedItems[0])" title="Cut (Ctrl+X)"><img src="./img/icon/ui/cut.png"></button>' +
            '<button class="explorer-ribbon-btn" onclick="explorerCopy(\'' + winId + '\', explorerSelectedItems[0])" title="Copy (Ctrl+C)"><img src="./img/icon/ui/copy.png"></button>' +
            '<button class="explorer-ribbon-btn" onclick="explorerPaste(\'' + winId + '\')" title="Paste (Ctrl+V)"><img src="./img/icon/ui/paste.png"></button>' +
            '<button class="explorer-ribbon-btn" onclick="if(explorerSelectedItems[0]) explorerRename(\'' + winId + '\', explorerSelectedItems[0])" title="Rename (F2)"><img src="./img/icon/ui/rename.png"></button>' +
            '<button class="explorer-ribbon-btn" title="Share"><img src="./img/icon/ui/share.png"></button>' +
            '<button class="explorer-ribbon-btn" onclick="if(explorerSelectedItems[0]) explorerDelete(\'' + winId + '\', explorerSelectedItems[0])" title="Delete (Del)"><span class="material-symbols-rounded" style="font-size:16px; color:#c42b1c;">delete</span></button>' +
            '</div>' +
            '<div class="explorer-ribbon-sec">' +
            '<button class="explorer-ribbon-btn" title="Sort"><img src="./img/icon/ui/sort.png"><span>Sort</span></button>' +
            '<button class="explorer-ribbon-btn" title="View" onclick="explorerCycleView(\'' + winId + '\')"><img src="./img/icon/ui/view.png"><span>View</span></button>' +
            '</div>' +
            '<button class="explorer-ribbon-more" title="See more">&#8943;</button>' +
            '</div>';

        // ---- Navigation Toolbar ----
        var canBack = explorerHistoryIdx > 0;
        var canFwd = explorerHistoryIdx < explorerHistory.length - 1;
        var canUp = currentVfsPath.split('\\').filter(function(p) { return p; }).length > 1;

        var addrIcon = getAddressBarIcon(currentVfsPath);
        var breadcrumb = buildBreadcrumb(currentVfsPath, winId);

        var toolbar = '<div class="explorer-toolbar">' +
            '<button class="explorer-nav-btn' + (canBack ? '' : ' disabled') + '" onclick="window.vfsState.goBack(\'' + winId + '\')" title="Back (Alt+Left)"><span class="material-symbols-rounded">arrow_back</span></button>' +
            '<button class="explorer-nav-btn' + (canFwd ? '' : ' disabled') + '" onclick="window.vfsState.goForward(\'' + winId + '\')" title="Forward (Alt+Right)"><span class="material-symbols-rounded">arrow_forward</span></button>' +
            '<button class="explorer-nav-btn' + (canUp ? '' : ' disabled') + '" onclick="window.vfsState.goUp(\'' + winId + '\')" title="Up (Alt+Up)"><span class="material-symbols-rounded">arrow_upward</span></button>' +
            '<div class="explorer-address-bar" onclick="explorerFocusAddress(\'' + winId + '\')">' +
            '<img src="' + addrIcon + '">' +
            '<div class="explorer-breadcrumb" id="' + winId + '-breadcrumb">' +
            '<img class="explorer-breadcrumb-icon" src="' + addrIcon + '">' +
            breadcrumb +
            '</div>' +
            '<input type="text" id="' + winId + '-address" value="' + currentVfsPath + '" onkeydown="if(event.key===\'Enter\'){window.vfsState.goTo(\'' + winId + '\', this.value); explorerBlurAddress(\'' + winId + '\');}" onblur="explorerBlurAddress(\'' + winId + '\')" style="opacity:0; position:absolute; left:0; width:100%; height:100%; padding:0 28px;">' +
            '</div>' +
            '<div class="explorer-search-bar">' +
            '<img src="./img/icon/ui/search.png">' +
            '<input type="text" id="' + winId + '-search" placeholder="Search ' + currentVfsPath.split('\\').pop() + '" oninput="window.vfsState.renderExplorer(\'' + winId + '\')">' +
            '</div>' +
            '</div>';

        // ---- Navigation Pane ----
        var navpane = '<div class="explorer-navpane">';

        // Quick access section
        navpane += '<div class="exp-section-header">Quick access</div>';
        navpane += buildNavItem('desk', 'Desktop', 'C:\\Users\\Anup\\Desktop', winId, { pinned: true });
        navpane += buildNavItem('down', 'Downloads', 'C:\\Users\\Anup\\Downloads', winId, { pinned: true });
        navpane += buildNavItem('docs', 'Documents', 'C:\\Users\\Anup\\Documents', winId, { pinned: true });
        navpane += buildNavItem('pics', 'Pictures', 'C:\\Users\\Anup\\Pictures', winId, { pinned: true });
        navpane += buildNavItem('music', 'Music', 'C:\\Users\\Anup\\Music', winId, { pinned: true });
        navpane += buildNavItem('vid', 'Videos', 'C:\\Users\\Anup\\Videos', winId, { pinned: true });

        navpane += '<div class="exp-nav-divider"></div>';

        // OneDrive
        navpane += buildNavItem('onedrive', 'OneDrive', 'C:\\Users\\Anup', winId, {});

        navpane += '<div class="exp-nav-divider"></div>';

        // This PC
        navpane += '<div class="exp-section-header">This PC</div>';
        navpane += buildNavItem('thispc', 'This PC', 'C:', winId, { open: currentVfsPath.split('\\').length <= 2 });

        navpane += '</div>';

        // ---- Content Area ----
        var searchInput = document.getElementById(winId + '-search');
        var searchTxt = searchInput ? searchInput.value.toLowerCase() : '';

        var contentInner = '';
        if (node && node.type === 'dir') {
            var names = Object.keys(node.children);
            // Separate directories and files, sort alphabetically
            var dirs = [], files = [];
            for (var i = 0; i < names.length; i++) {
                if (searchTxt && names[i].toLowerCase().indexOf(searchTxt) === -1) continue;
                if (node.children[names[i]].type === 'dir') dirs.push(names[i]);
                else files.push(names[i]);
            }
            dirs.sort(function(a,b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
            files.sort(function(a,b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
            var sorted = dirs.concat(files);

            if (explorerViewMode === 'details') {
                // Details view (table-like)
                contentInner += '<div class="explorer-details-header">' +
                    '<span class="explorer-details-col-name">Name</span>' +
                    '<span class="explorer-details-col-date">Date modified</span>' +
                    '<span class="explorer-details-col-type">Type</span>' +
                    '<span class="explorer-details-col-size">Size</span>' +
                    '</div>';
                for (var i = 0; i < sorted.length; i++) {
                    var n = sorted[i];
                    var isDir = node.children[n].type === 'dir';
                    var selClass = explorerSelectedItems.indexOf(n) >= 0 ? ' selected' : '';
                    contentInner += '<div class="explorer-details-row' + selClass + '" ' +
                        'onclick="explorerSelectItem(this, \'' + n.replace(/'/g, "\\'") + '\', event)" ' +
                        'ondblclick="window.vfsState.open(\'' + winId + '\',\'' + n.replace(/'/g, "\\'") + '\')" ' +
                        'oncontextmenu="showExplorerContextMenu(event, \'' + winId + '\', \'' + n.replace(/'/g, "\\'") + '\')">' +
                        getSmallIcon(n, isDir) +
                        '<span class="explorer-details-col-name">' + n + '</span>' +
                        '<span class="explorer-details-col-date">' + formatFileDate() + '</span>' +
                        '<span class="explorer-details-col-type">' + getFileType(n, isDir) + '</span>' +
                        '<span class="explorer-details-col-size">' + (isDir ? '' : '1 KB') + '</span>' +
                        '</div>';
                }
            } else {
                // Grid view (medium or large icons)
                var iconSize = explorerViewMode === 'large' ? 64 : 48;
                var gridCols = explorerViewMode === 'large' ? '110px' : '96px';
                var itemsHTML = '';
                for (var i = 0; i < sorted.length; i++) {
                    var n = sorted[i];
                    var isDir = node.children[n].type === 'dir';
                    var selClass = explorerSelectedItems.indexOf(n) >= 0 ? ' selected' : '';
                    itemsHTML += '<div class="explorer-file-item' + selClass + '" style="width:' + gridCols + ';" ' +
                        'onclick="explorerSelectItem(this, \'' + n.replace(/'/g, "\\'") + '\', event)" ' +
                        'ondblclick="window.vfsState.open(\'' + winId + '\',\'' + n.replace(/'/g, "\\'") + '\')" ' +
                        'oncontextmenu="showExplorerContextMenu(event, \'' + winId + '\', \'' + n.replace(/'/g, "\\'") + '\')">' +
                        getFileIconHTML(n, isDir, iconSize) +
                        '<span class="explorer-file-item-name">' + n + '</span></div>';
                }
                contentInner = '<div class="explorer-file-grid" style="grid-template-columns:repeat(auto-fill,' + gridCols + ');">' + itemsHTML + '</div>';
            }

            if (sorted.length === 0) {
                contentInner = searchTxt
                    ? '<div class="explorer-empty">No items match your search.</div>'
                    : '<div class="explorer-empty">This folder is empty.</div>';
            }
        }

        var contentArea = '<div class="explorer-content" tabindex="-1" oncontextmenu="showExplorerContextMenu(event, \'' + winId + '\', null)" onclick="if(event.target===this||event.target.classList.contains(\'explorer-file-grid\')||event.target.classList.contains(\'explorer-content-wrap\')){var s=this.querySelectorAll(\'.selected\');for(var i=0;i<s.length;i++)s[i].classList.remove(\'selected\');explorerSelectedItems=[];}">' +
            '<div class="explorer-content-wrap">' + contentInner + '</div></div>';

        // ---- Status Bar ----
        var actualCount = node && node.type === 'dir' ? Object.keys(node.children).length : 0;
        var selCount = explorerSelectedItems.length;
        var statusText = actualCount + ' item' + (actualCount !== 1 ? 's' : '');
        if (selCount > 0) statusText += '  |  ' + selCount + ' selected';

        var statusbar = '<div class="explorer-statusbar">' +
            '<span>' + statusText + '</span>' +
            '<div class="explorer-view-btns">' +
            '<button class="explorer-view-btn' + (explorerViewMode === 'details' ? ' active' : '') + '" title="Details" onclick="explorerViewMode=\'details\'; window.vfsState.renderExplorer(\'' + winId + '\')"><span class="material-symbols-rounded" style="font-size:16px;">view_list</span></button>' +
            '<button class="explorer-view-btn' + (explorerViewMode === 'medium' ? ' active' : '') + '" title="Medium icons" onclick="explorerViewMode=\'medium\'; window.vfsState.renderExplorer(\'' + winId + '\')"><span class="material-symbols-rounded" style="font-size:16px;">grid_view</span></button>' +
            '<button class="explorer-view-btn' + (explorerViewMode === 'large' ? ' active' : '') + '" title="Large icons" onclick="explorerViewMode=\'large\'; window.vfsState.renderExplorer(\'' + winId + '\')"><span class="material-symbols-rounded" style="font-size:16px;">view_module</span></button>' +
            '</div>' +
            '</div>';

        // ---- Assemble ----
        var html = '<div class="explorer-shell">' +
            ribbon + toolbar +
            '<div class="explorer-body">' + navpane + contentArea + '</div>' +
            statusbar +
            '</div>';

        var el = document.getElementById(winId + '-content');
        if (el) el.innerHTML = html;
        return html;
    },

    open: function (winId, name) {
        var path = currentVfsPath + '\\' + name;
        var node = getVfsNode(path);
        if (!node) return;
        if (node.type === 'dir') {
            currentVfsPath = path;
            explorerPushHistory(currentVfsPath);
            explorerSelectedItems = [];
            this.renderExplorer(winId);
        } else if (name.endsWith('.txt')) {
            openFile(name, node.content);
        } else if (name === 'installer.exe') {
            runInstaller('installer.exe');
        } else if (name === 'Cheats++.exe' || name === 'Cheats++.lnk') {
            runInstaller('Cheats++.exe');
        } else if (name === 'TicTacToe.lnk') {
            openApp('TicTacToe', 'img/tictactoe.png');
        } else if (name === 'Typing.lnk') {
            openApp('Typing', 'img/typing.png');
        } else if (name === 'Quiz.lnk') {
            openApp('Quiz', 'img/quiz.png');
        } else if (name === 'Snake.lnk') {
            openApp('Snake', 'img/snake.png');
        } else if (name === 'anupsharma12.com.np' || name === 'anupsharma12.com.np.lnk') {
            window.open('https://anupsharma12.com.np', '_blank');
        } else if (name.endsWith('.jpg') || name.endsWith('.png')) {
            var imgSrc = name === 'wallpaper.jpg' ? 'img/wallpapers/1.jpg' : '';
            if (imgSrc) {
                openImageViewer(name, imgSrc);
            }
        }
    },

    goTo: function (winId, path) {
        var p = path.replace(/\//g, '\\');
        if (getVfsNode(p)) {
            currentVfsPath = p;
            explorerPushHistory(currentVfsPath);
            explorerSelectedItems = [];
            this.renderExplorer(winId);
        }
    },

    goUp: function (winId) {
        var parts = currentVfsPath.split('\\');
        if (parts.length > 1) {
            parts.pop();
            currentVfsPath = parts.join('\\') || 'C:';
            explorerPushHistory(currentVfsPath);
            explorerSelectedItems = [];
            this.renderExplorer(winId);
        }
    },

    goBack: function (winId) {
        if (explorerHistoryIdx > 0) {
            explorerHistoryIdx--;
            currentVfsPath = explorerHistory[explorerHistoryIdx];
            explorerSelectedItems = [];
            this.renderExplorer(winId);
        }
    },

    goForward: function (winId) {
        if (explorerHistoryIdx < explorerHistory.length - 1) {
            explorerHistoryIdx++;
            currentVfsPath = explorerHistory[explorerHistoryIdx];
            explorerSelectedItems = [];
            this.renderExplorer(winId);
        }
    },

    newFolder: function (winId) {
        closeExplorerContextMenu();
        var node = getVfsNode(currentVfsPath);
        if (!node || node.type !== 'dir') return;
        var name = 'New folder';
        var idx = 1;
        while (node.children[name]) { name = 'New folder (' + idx + ')'; idx++; }
        node.children[name] = { type: 'dir', children: {} };
        this.renderExplorer(winId);
    }
};

// Address bar focus/blur to toggle breadcrumb vs text input
function explorerFocusAddress(winId) {
    var bc = document.getElementById(winId + '-breadcrumb');
    var inp = document.getElementById(winId + '-address');
    if (bc) bc.style.display = 'none';
    if (inp) { inp.style.opacity = '1'; inp.style.position = 'relative'; inp.style.padding = '0 4px'; inp.focus(); inp.select(); }
}

function explorerBlurAddress(winId) {
    var bc = document.getElementById(winId + '-breadcrumb');
    var inp = document.getElementById(winId + '-address');
    if (bc) bc.style.display = '';
    if (inp) { inp.style.opacity = '0'; inp.style.position = 'absolute'; inp.style.padding = '0 28px'; }
}

// Cycle view mode
function explorerCycleView(winId) {
    if (explorerViewMode === 'medium') explorerViewMode = 'large';
    else if (explorerViewMode === 'large') explorerViewMode = 'details';
    else explorerViewMode = 'medium';
    window.vfsState.renderExplorer(winId);
}

// Global click handler to close context menu
document.addEventListener('click', function() {
    closeExplorerContextMenu();
});

// Keyboard shortcuts for explorer
document.addEventListener('keydown', function(e) {
    // Find active explorer window
    var explorerWin = document.querySelector('.explorer-shell');
    if (!explorerWin) return;
    var winEl = explorerWin.closest('.window');
    if (!winEl) return;
    var winId = winEl.id;

    if (e.ctrlKey && e.key === 'c') {
        if (explorerSelectedItems.length) { explorerCopy(winId, explorerSelectedItems[0]); e.preventDefault(); }
    } else if (e.ctrlKey && e.key === 'x') {
        if (explorerSelectedItems.length) { explorerCut(winId, explorerSelectedItems[0]); e.preventDefault(); }
    } else if (e.ctrlKey && e.key === 'v') {
        if (explorerClipboard) { explorerPaste(winId); e.preventDefault(); }
    } else if (e.key === 'Delete') {
        if (explorerSelectedItems.length) { explorerDelete(winId, explorerSelectedItems[0]); e.preventDefault(); }
    } else if (e.key === 'F2') {
        if (explorerSelectedItems.length) { explorerRename(winId, explorerSelectedItems[0]); e.preventDefault(); }
    } else if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
        window.vfsState.goUp(winId); e.preventDefault();
    } else if (e.altKey && e.key === 'ArrowLeft') {
        window.vfsState.goBack(winId); e.preventDefault();
    } else if (e.altKey && e.key === 'ArrowRight') {
        window.vfsState.goForward(winId); e.preventDefault();
    } else if (e.key === 'Enter' && explorerSelectedItems.length && !e.target.matches('input, textarea')) {
        window.vfsState.open(winId, explorerSelectedItems[0]); e.preventDefault();
    }
});

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
            result = 'Commands: cd, dir, cls, help';

        } else if (command === 'cd') {
            if (args[1]) {
                var targetPath = resolvePath(terminalPath, args.slice(1).join(' '));
                if (getVfsNode(targetPath)) {
                    terminalPath = normalizeVfsPath(targetPath);
                } else {
                    result = 'Path not found.';
                }
            } else {
                result = terminalPath;
            }

        } else if (command === 'dir' || command === 'ls') {
            if (node && node.children) {
                var keys = Object.keys(node.children);
                result = keys.map(function (k) { return (node.children[k].type === 'dir' ? '📁 ' : '📄 ') + k; }).join('<br>') || 'Empty';
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
var fullBleedApps = ['Explorer', 'Terminal', 'Browser', 'Spotify', 'Calculator', 'TicTacToe', 'Quiz', 'Typing', 'Settings', 'Paint', 'VS Code', 'Snake', 'Minecraft', 'skribbl.io', 'Geometry Dash Lite', 'Flappy Bird'];

// Open a new application window on the desktop
function openApp(appName, iconPath) {
    if (appName === 'Cheats++') {
        runInstaller('Cheats++.exe');
        return;
    }
    winCount++;
    topZ++;

    var winId = 'win-' + winCount;
    var winElement = document.createElement('div');
    winElement.className = 'window';
    winElement.id = winId;
    winElement.style.zIndex = topZ;

    // Per-app default sizes (mirroring Win11 proportions)
    var winW = 850, winH = 560;
    if (appName === 'Calculator') { winW = 320; winH = 500; }
    else if (appName === 'Settings') { winW = 960; winH = 640; }
    else if (appName === 'Paint') { winW = 900; winH = 590; }
    else if (appName === 'Terminal') { winW = 720; winH = 480; }
    else if (appName === 'Notepad') { winW = 660; winH = 520; }
    else if (appName === 'TicTacToe') { winW = 420; winH = 480; }
    else if (appName === 'Quiz') { winW = 640; winH = 540; }
    else if (appName === 'Typing') { winW = 680; winH = 480; }
    else if (appName === 'Spotify') { winW = 400; winH = 600; }
    else if (appName === 'VS Code') { winW = 900; winH = 600; }
    else if (appName === 'Snake') { winW = 440; winH = 520; }

    winElement.style.width = winW + 'px';
    winElement.style.height = winH + 'px';

    // Center on the available desktop area (subtract 40px taskbar)
    var left = Math.max(20, Math.round((window.innerWidth - winW) / 2));
    var top = Math.max(10, Math.round((window.innerHeight - 40 - winH) / 2));
    winElement.style.left = left + 'px';
    winElement.style.top = top + 'px';

    var content = getAppContent(appName, winId);
    var contentPadding = fullBleedApps.indexOf(appName) > -1 ? 'padding:0;' : '';

    winElement.innerHTML =
        '<div class="title-bar" onmousedown="makeDraggable(event, \'' + winId + '\')">' +
        '<div class="title-bar-left">' +
        '<img src="' + iconPath + '" onerror="this.style.display=\'none\'">' +
        '<span>' + appName + '</span>' +
        '</div>' +
        '<div class="win-controls">' +
        '<button class="win-btn" onclick="minimizeApp(\'' + winId + '\')" title="Minimize">&#x2500;</button>' +
        '<button class="win-btn" onclick="toggleMaximize(\'' + winId + '\')" title="Maximize">&#x2750;</button>' +
        '<button class="win-btn close" onclick="closeApp(\'' + winId + '\')" title="Close">&#x2715;</button>' +
        '</div>' +
        '</div>' +
        '<div class="content" style="' + contentPadding + '">' + content + '</div>';

    document.getElementById('desktop').appendChild(winElement);
    addTaskbarIcon(winId, iconPath);

    winElement.onmousedown = function () {
        topZ++;
        winElement.style.zIndex = topZ;
    };

    document.getElementById('startMenu').classList.add('hidden');

    if (appName === 'Explorer') {
        setTimeout(function () { window.vfsState.renderExplorer(winId); }, 50);
    }
    if (appName === 'Quiz') {
        setTimeout(function () { quizInit('quiz-' + winId); }, 50);
    }
    if (appName === 'Typing') {
        setTimeout(function () { typingInit('type-' + winId); }, 50);
    }
    if (appName === 'Settings') {
        setTimeout(function () { settingsInit(winId); }, 50);
    }
    if (appName === 'Paint') {
        setTimeout(function () { paintInit(winId); }, 50);
    }
    if (appName === 'Snake') {
        setTimeout(function () { snakeInit('snake-' + winId); }, 50);
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
    var fileW = 660, fileH = 520;
    winElement.style.width = fileW + 'px';
    winElement.style.height = fileH + 'px';
    winElement.style.left = Math.max(20, Math.round((window.innerWidth - fileW) / 2)) + 'px';
    winElement.style.top = Math.max(10, Math.round((window.innerHeight - 40 - fileH) / 2)) + 'px';

    // Escape HTML entities in the file content to prevent rendering
    var safeContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    winElement.innerHTML =
        '<div class="title-bar" onmousedown="makeDraggable(event, \'' + winId + '\')">' +
        '<div class="title-bar-left">' +
        '<img src="img/notepad.png" onerror="this.style.display=\'none\'">' +
        '<span>' + fileName + ' — Notepad</span>' +
        '</div>' +
        '<div class="win-controls">' +
        '<button class="win-btn" onclick="minimizeApp(\'' + winId + '\')" title="Minimize">&#x2500;</button>' +
        '<button class="win-btn" onclick="toggleMaximize(\'' + winId + '\')" title="Maximize">&#x2750;</button>' +
        '<button class="win-btn close" onclick="closeApp(\'' + winId + '\')" title="Close">&#x2715;</button>' +
        '</div>' +
        '</div>' +
        '<div class="content">' +
        '<textarea style="width:100%; height:100%; border:none; outline:none; font-family:Consolas,monospace; font-size:14px; padding:10px; resize:none;">' + safeContent + '</textarea>' +
        '</div>';

    document.getElementById('desktop').appendChild(winElement);
    addTaskbarIcon(winId, 'img/notepad.png');

    winElement.onmousedown = function () { topZ++; winElement.style.zIndex = topZ; };
}

function openImageViewer(fileName, imgSrc) {
    winCount++;
    topZ++;

    var winId = 'win-' + winCount;
    var winElement = document.createElement('div');
    winElement.className = 'window';
    winElement.id = winId;
    winElement.style.zIndex = topZ;
    var imgW = 800, imgH = 560;
    winElement.style.width = imgW + 'px';
    winElement.style.height = imgH + 'px';
    winElement.style.left = Math.max(20, Math.round((window.innerWidth - imgW) / 2)) + 'px';
    winElement.style.top = Math.max(10, Math.round((window.innerHeight - 40 - imgH) / 2)) + 'px';

    winElement.innerHTML =
        '<div class="title-bar" onmousedown="makeDraggable(event, \'' + winId + '\')">' +
        '<div class="title-bar-left">' +
        '<img src="img/files.png" onerror="this.style.display=\'none\'">' +
        '<span>' + fileName + ' \u2014 Photo Viewer</span>' +
        '</div>' +
        '<div class="win-controls">' +
        '<button class="win-btn" onclick="minimizeApp(\'' + winId + '\')" title="Minimize">&#x2500;</button>' +
        '<button class="win-btn" onclick="toggleMaximize(\'' + winId + '\')" title="Maximize">&#x2750;</button>' +
        '<button class="win-btn close" onclick="closeApp(\'' + winId + '\')" title="Close">&#x2715;</button>' +
        '</div>' +
        '</div>' +
        '<div class="content" style="padding:0; display:flex; align-items:center; justify-content:center; background:#111;">' +
        '<img src="' + imgSrc + '" alt="' + fileName + '" style="max-width:100%; max-height:100%; object-fit:contain;">' +
        '</div>';

    document.getElementById('desktop').appendChild(winElement);
    addTaskbarIcon(winId, 'img/files.png');
    winElement.onmousedown = function () { topZ++; winElement.style.zIndex = topZ; };
}

function runInstaller(programName) {
    programName = programName || 'installer.exe';
    var overlay = document.createElement('div');
    overlay.id = 'uac-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%;' +
        'background:rgba(0,0,0,0.45); z-index:12000; display:flex; align-items:center; justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText = 'width:420px; background:#f3f3f3; border:1px solid #c8c8c8; border-radius:8px;' +
        'box-shadow:0 20px 60px rgba(0,0,0,0.35); font-family:Segoe UI,sans-serif; overflow:hidden;';

    box.innerHTML =
        '<div style="background:#1f4e8c; color:#fff; padding:12px 16px; font-size:14px;">User Account Control</div>' +
        '<div style="padding:16px; font-size:13px; color:#333;">' +
        '<div style="font-weight:600; margin-bottom:6px;">Do you want to allow this app to make changes to your device?</div>' +
        '<div style="margin-bottom:12px;">Program: ' + programName + '</div>' +
        '<div style="font-size:12px; color:#666;">Verified publisher: Unknown</div>' +
        '</div>' +
        '<div style="display:flex; justify-content:flex-end; gap:10px; padding:12px 16px; background:#ededed;">' +
        '<button id="uac-no" style="padding:6px 16px; border:1px solid #bbb; background:#fff; border-radius:4px; cursor:pointer;">No</button>' +
        '<button id="uac-yes" style="padding:6px 16px; border:1px solid #1f4e8c; background:#1f4e8c; color:#fff; border-radius:4px; cursor:pointer;">Yes</button>' +
        '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('uac-no').onclick = function () {
        overlay.remove();
    };

    document.getElementById('uac-yes').onclick = function () {
        overlay.remove();
        spawnInstallerErrors();
    };
}

function spawnInstallerErrors() {
    var count = 10 + Math.floor(Math.random() * 6);
    var errorsShown = 0;

    function showOneError() {
        errorsShown++;
        var popup = document.createElement('div');
        popup.style.cssText = 'position:fixed; width:320px; background:#fff; border:1px solid #c8c8c8;' +
            'border-radius:6px; box-shadow:0 12px 30px rgba(0,0,0,0.3); font-family:Segoe UI,sans-serif; z-index:12010;';

        var left = 40 + Math.random() * (window.innerWidth - 380);
        var top = 40 + Math.random() * (window.innerHeight - 200);
        popup.style.left = Math.max(10, left) + 'px';
        popup.style.top = Math.max(10, top) + 'px';

        popup.innerHTML =
            '<div style="background:#e8e8e8; padding:8px 12px; font-size:12px; border-bottom:1px solid #d0d0d0;">System Error</div>' +
            '<div style="padding:14px; font-size:13px; color:#333;">The application was unable to start correctly (0xc0000142).</div>' +
            '<div style="display:flex; justify-content:flex-end; padding:10px 12px; background:#f5f5f5;">' +
            '<button style="padding:5px 14px; border:1px solid #bbb; background:#fff; border-radius:4px;">OK</button>' +
            '</div>';

        document.body.appendChild(popup);

        if (errorsShown >= count) {
            setTimeout(showBlueScreen, 1200);
        } else {
            setTimeout(showOneError, 150);
        }
    }

    showOneError();
}

function showBlueScreen() {
    var bsod = document.createElement('div');
    bsod.id = 'bsod';
    bsod.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#1d4ed8;' +
        'color:#fff; z-index:13000; font-family:Segoe UI,sans-serif; padding:60px; box-sizing:border-box;';

    bsod.innerHTML =
        '<div style="font-size:18px; margin-bottom:16px;">:(</div>' +
        '<div style="font-size:28px; font-weight:600; margin-bottom:16px;">Your device ran into a problem and needs to restart.</div>' +
        '<div style="font-size:16px; margin-bottom:24px;">We\'re just collecting some error info, and then we\'ll restart for you.</div>' +
        '<div style="font-size:14px;">Stop code: INSTALLER_FAILURE</div>';

    document.body.appendChild(bsod);

    setTimeout(function () {
        location.reload();
    }, 3000);
}

var browserState = {};

function browserInit(frameId, inputId) {
    if (browserState[frameId]) return;
    var frame = document.getElementById(frameId);
    if (!frame) return;
    var startUrl = frame.getAttribute('src') || 'https://en.wikipedia.org';
    browserState[frameId] = { history: [startUrl], index: 0, inputId: inputId };
    var input = document.getElementById(inputId);
    if (input) input.value = startUrl;
}

function browserNavigate(frameId, inputId, url) {
    var frame = document.getElementById(frameId);
    if (!frame) return;
    browserInit(frameId, inputId);

    var state = browserState[frameId];
    var nextUrl = url;
    if (nextUrl.indexOf('http') !== 0) nextUrl = 'https://' + nextUrl;

    state.history = state.history.slice(0, state.index + 1);
    state.history.push(nextUrl);
    state.index = state.history.length - 1;

    frame.src = nextUrl;
    var input = document.getElementById(inputId);
    if (input) input.value = nextUrl;
}

function browserReload(frameId) {
    var state = browserState[frameId];
    var frame = document.getElementById(frameId);
    if (!frame || !state) return;
    frame.src = state.history[state.index];
}

function browserGoBack(frameId) {
    var state = browserState[frameId];
    var frame = document.getElementById(frameId);
    if (!frame || !state || state.index === 0) return;
    state.index--;
    frame.src = state.history[state.index];
    var input = document.getElementById(state.inputId);
    if (input) input.value = state.history[state.index];
}

function browserGoForward(frameId) {
    var state = browserState[frameId];
    var frame = document.getElementById(frameId);
    if (!frame || !state || state.index >= state.history.length - 1) return;
    state.index++;
    frame.src = state.history[state.index];
    var input = document.getElementById(state.inputId);
    if (input) input.value = state.history[state.index];
}

var settingsPages = ['system', 'personalization', 'windowsupdate'];

function applyWallpaper(path) {
    if (!path) return;
    activeWallpaper = path;

    document.body.style.backgroundImage = 'url("' + path + '")';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';

    var lockBg = document.querySelector('.lock-bg');
    if (lockBg) {
        lockBg.style.backgroundImage = 'url("' + path + '")';
        lockBg.style.backgroundSize = 'cover';
        lockBg.style.backgroundPosition = 'center';
    }

    try {
        localStorage.setItem('winos-wallpaper', path);
    } catch (err) { }

    settingsRefreshAll();
}

function loadSavedWallpaper() {
    try {
        var savedWallpaper = localStorage.getItem('winos-wallpaper');
        if (savedWallpaper) activeWallpaper = savedWallpaper;
    } catch (err) { }

    applyWallpaper(activeWallpaper);
}

function settingsInit(winId) {
    settingsRender(winId, 'system');
}

function settingsRefreshAll() {
    var shells = document.querySelectorAll('.settings-shell');
    for (var i = 0; i < shells.length; i++) {
        var winId = shells[i].getAttribute('data-settings-winid');
        var page = shells[i].getAttribute('data-page') || 'personalization';
        if (winId) settingsRender(winId, page);
    }
}

function settingsSwitchPage(winId, page) {
    settingsRender(winId, page);
}

function settingsRender(winId, page) {
    var shell = document.getElementById('settings-' + winId);
    var main = document.getElementById('settings-main-' + winId);
    if (!shell || !main) return;

    shell.setAttribute('data-page', page);

    var navButtons = shell.querySelectorAll('.settings-nav-btn');
    for (var i = 0; i < navButtons.length; i++) {
        var isActive = navButtons[i].getAttribute('data-page') === page;
        navButtons[i].className = isActive ? 'settings-nav-btn active' : 'settings-nav-btn';
    }

    var html = '';

    if (page === 'system') {
        html = '<h2 class="settings-page-title">System</h2>' +
            '<p class="settings-page-subtitle">Display, sound, storage, and the overall state of your pretend machine.</p>' +
            '<div class="settings-hero-card">' +
            '<div>' +
            '<h3 class="settings-hero-title">WinOS 11 Home</h3>' +
            '<p class="settings-hero-text">This machine is running a fully questionable build of WinOS with desktop apps, floating windows, and just enough chaos to feel real.</p>' +
            '</div>' +
            '<div class="settings-mini-stack">' +
            '<div class="settings-stat"><div class="settings-stat-label">Processor</div><div class="settings-stat-value">Imaginary i9</div></div>' +
            '<div class="settings-stat"><div class="settings-stat-label">Memory</div><div class="settings-stat-value">64 GB vibes</div></div>' +
            '<div class="settings-stat"><div class="settings-stat-label">Storage</div><div class="settings-stat-value">Almost infinite</div></div>' +
            '</div>' +
            '</div>' +
            '<div class="settings-grid">' +
            '<div class="settings-card">' +
            '<h4>Device specifications</h4>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">keyboard</span><strong>Device name</strong></div><span>ANUP-DESKTOP</span></div>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">info</span><strong>Edition</strong></div><span>WinOS 11 Home</span></div>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">touch_app</span><strong>Touch support</strong></div><span>Support enabled</span></div>' +
            '</div>' +
            '<div class="settings-card">' +
            '<h4>Quick status</h4>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">update</span><strong>Windows Update</strong></div><span class="settings-pill">Up to date</span></div>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">verified</span><strong>Activation</strong></div><span>Active, Linked</span></div>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">battery_full_alt</span><strong>Battery</strong></div><span>100% Plugged in</span></div>' +
            '</div>' +
            '</div>';
    }

    if (page === 'personalization') {
        var wallpaperCards = '';
        for (var w = 0; w < wallpaperChoices.length; w++) {
            var path = wallpaperChoices[w];
            var isSelected = path === activeWallpaper;
            wallpaperCards += '<div class="settings-wallpaper-card">' +
                '<img class="settings-wallpaper-preview" src="' + path + '" alt="Wallpaper ' + (w + 1) + '" onerror="this.src=\'./img/wallpapers/1.jpg\'">' +
                '<div class="settings-wallpaper-meta">' +
                '<strong>Wallpaper ' + (w + 1) + '</strong>' +
                '<div class="settings-wallpaper-actions">' +
                '<button class="settings-apply-btn" onclick="applyWallpaper(\'' + path + '\')">' + (isSelected ? 'Applied' : 'Apply') + '</button>' +
                '<span class="settings-selected-tag">' + (isSelected ? 'Current' : '') + '</span>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        html = '<h2 class="settings-page-title">Personalization</h2>' +
            '<p class="settings-page-subtitle">Background, colors, and the part of Windows everyone changes first.</p>' +
            '<div class="settings-hero-card">' +
            '<div>' +
            '<h3 class="settings-hero-title">Background</h3>' +
            '<p class="settings-hero-text">Choose one of the wallpapers below. WinOS will apply it to the desktop and lock screen immediately.</p>' +
            '</div>' +
            '<div class="settings-mini-stack">' +
            '<div class="settings-stat"><div class="settings-stat-label">Current wallpaper</div><div class="settings-stat-value">' + (activeWallpaper.indexOf('img/wallpapers/') === 0 ? activeWallpaper.replace('img/wallpapers/', 'Wallpaper ').replace('.jpg', '') : 'Default wallpaper') + '</div></div>' +
            '<div class="settings-stat"><div class="settings-stat-label">Source folder</div><div class="settings-stat-value">img/wallpapers</div></div>' +
            '</div>' +
            '</div>' +
            '<div class="settings-card" style="margin-bottom:16px;">' +
            '<h4>Preview</h4>' +
            '<p>This preview mirrors the wallpaper currently applied to the desktop.</p>' +
            '<div style="margin-top:14px; border-radius:16px; overflow:hidden; border:1px solid #e6e9f0; background:#dbe4f0;">' +
            '<img src="' + activeWallpaper + '" alt="Current wallpaper preview" style="display:block; width:100%; height:220px; object-fit:cover;" onerror="this.src=\'./img/wallpapers/1.jpg\'">' +
            '</div>' +
            '</div>' +
            '<div class="settings-wallpaper-grid">' + wallpaperCards + '</div>';
    }

    if (page === 'windowsupdate') {
        html = '<h2 class="settings-page-title">Windows Update</h2>' +
            '<p class="settings-page-subtitle">Because even fake operating systems deserve reassuring green checkmarks.</p>' +
            '<div class="settings-card" style="margin-bottom:16px;">' +
            '<h4>Status</h4>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">history</span><strong>Last checked</strong></div><span>Just now</span></div>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">security_update_good</span><strong>Quality updates</strong></div><span>No pending updates</span></div>' +
            '<div class="settings-row"><div class="settings-row-left"><span class="material-symbols-rounded settings-row-icon">new_releases</span><strong>Feature update</strong></div><span>WinOS 11 Moment 1 installed</span></div>' +
            '</div>' +
            '<div class="settings-grid">' +
            '<div class="settings-card"><h4>Update history</h4><p>Security Intelligence Update KB500-WINOS installed successfully with zero evidence.</p></div>' +
            '<div class="settings-card"><h4>Advanced options</h4><p>Optional updates are disabled because the current desktop is already dramatic enough.</p></div>' +
            '</div>';
    }

    main.innerHTML = html;
}

var paintState = {};

function paintInit(winId) {
    var wrap = document.getElementById('paint-wrap-' + winId);
    var canvas = document.getElementById('paint-canvas-' + winId);
    if (!wrap || !canvas) return;

    if (!paintState[winId]) {
        paintState[winId] = {
            tool: 'brush',
            color: '#202020',
            size: 6,
            drawing: false,
            lastX: 0,
            lastY: 0,
            booted: false
        };
    }

    paintResize(winId);
    paintUpdateToolbar(winId);
}

function paintResize(winId) {
    var state = paintState[winId];
    var wrap = document.getElementById('paint-wrap-' + winId);
    var canvas = document.getElementById('paint-canvas-' + winId);
    if (!state || !wrap || !canvas) return;
    if (wrap.clientWidth < 20 || wrap.clientHeight < 20) return;

    var snapshot = state.booted ? canvas.toDataURL('image/png') : '';
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;

    var ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    state.ctx = ctx;

    if (!state.booted) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        state.booted = true;
        return;
    }

    var img = new Image();
    img.onload = function () {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = snapshot;
}

function paintGetPoint(winId, event) {
    var canvas = document.getElementById('paint-canvas-' + winId);
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function paintBegin(winId, event) {
    var state = paintState[winId];
    if (!state || !state.ctx) return;

    if (state.tool === 'fill') {
        paintFill(winId);
        return;
    }

    var point = paintGetPoint(winId, event);
    state.drawing = true;
    state.lastX = point.x;
    state.lastY = point.y;

    state.ctx.beginPath();
    state.ctx.fillStyle = state.tool === 'eraser' ? '#ffffff' : state.color;
    state.ctx.arc(point.x, point.y, Math.max(1, state.size / 2), 0, Math.PI * 2);
    state.ctx.fill();
}

function paintMove(winId, event) {
    var state = paintState[winId];
    if (!state || !state.ctx || !state.drawing) return;

    var point = paintGetPoint(winId, event);
    state.ctx.beginPath();
    state.ctx.moveTo(state.lastX, state.lastY);
    state.ctx.lineTo(point.x, point.y);
    state.ctx.lineWidth = state.size;
    state.ctx.strokeStyle = state.tool === 'eraser' ? '#ffffff' : state.color;
    state.ctx.stroke();

    state.lastX = point.x;
    state.lastY = point.y;
}

function paintStop(winId) {
    var state = paintState[winId];
    if (!state) return;
    state.drawing = false;
}

function paintSetTool(winId, tool) {
    var state = paintState[winId];
    if (!state) return;
    state.tool = tool;
    paintUpdateToolbar(winId);
}

function paintSetColor(winId, value) {
    var state = paintState[winId];
    if (!state) return;
    state.color = value;
    paintUpdateToolbar(winId);
}

function paintSetSize(winId, value) {
    var state = paintState[winId];
    if (!state) return;
    state.size = parseInt(value, 10) || 1;
    paintUpdateToolbar(winId);
}

function paintClear(winId) {
    var state = paintState[winId];
    var canvas = document.getElementById('paint-canvas-' + winId);
    if (!state || !state.ctx || !canvas) return;
    state.ctx.fillStyle = '#ffffff';
    state.ctx.fillRect(0, 0, canvas.width, canvas.height);
    paintSetStatus(winId, 'Canvas cleared.');
}

function paintFill(winId) {
    var state = paintState[winId];
    var canvas = document.getElementById('paint-canvas-' + winId);
    if (!state || !state.ctx || !canvas) return;
    state.ctx.fillStyle = state.color;
    state.ctx.fillRect(0, 0, canvas.width, canvas.height);
    paintSetStatus(winId, 'Canvas filled with ' + state.color + '.');
}

function paintSave(winId) {
    var canvas = document.getElementById('paint-canvas-' + winId);
    if (!canvas) return;
    var link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'winos-paint-' + Date.now() + '.png';
    link.click();
    paintSetStatus(winId, 'PNG downloaded.');
}

function paintUpdateToolbar(winId) {
    var state = paintState[winId];
    if (!state) return;

    var brushBtn = document.getElementById('paint-tool-brush-' + winId);
    var eraserBtn = document.getElementById('paint-tool-eraser-' + winId);
    var fillBtn = document.getElementById('paint-tool-fill-' + winId);
    var sizeInput = document.getElementById('paint-size-' + winId);
    var colorInput = document.getElementById('paint-color-' + winId);

    if (brushBtn) brushBtn.className = state.tool === 'brush' ? 'paint-tool-btn active' : 'paint-tool-btn';
    if (eraserBtn) eraserBtn.className = state.tool === 'eraser' ? 'paint-tool-btn active' : 'paint-tool-btn';
    if (fillBtn) fillBtn.className = state.tool === 'fill' ? 'paint-tool-btn active' : 'paint-tool-btn';
    if (sizeInput) sizeInput.value = state.size;
    if (colorInput) colorInput.value = state.color;

    paintSetStatus(winId, 'Tool: ' + state.tool + ' • Size: ' + state.size + 'px • Color: ' + state.color);
}

function paintSetStatus(winId, message) {
    var status = document.getElementById('paint-status-' + winId);
    if (status) status.textContent = message;
}

function getAppContent(appName, winId) {
    if (appName === 'Snake') {
        var sid = 'snake-' + winId;
        return '<div id="' + sid + '" style="height:100%; display:flex; flex-direction:column; background:#1a1a2e; font-family:Segoe UI,sans-serif; position:relative; outline:none;" tabindex="0">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#16213e;">' +
            '<span style="font-size:1.3em; font-weight:bold; color:#0f3460;"> <span style="color:#e94560;">Snake</span></span>' +
            '<span id="' + sid + '-score" style="font-size:1em; color:#eee;">Score: 0</span>' +
            '</div>' +
            '<div style="flex:1; display:flex; align-items:center; justify-content:center; padding:10px;">' +
            '<canvas id="' + sid + '-canvas" style="background:#0f3460; border-radius:8px;"></canvas>' +
            '</div>' +
            '<div id="' + sid + '-overlay" style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(26,26,46,0.92); display:none; flex-direction:column; justify-content:center; align-items:center; text-align:center; z-index:2;">' +
            '<h2 id="' + sid + '-endtitle" style="color:#e94560; font-size:1.8em; margin:10px;"></h2>' +
            '<p id="' + sid + '-endscore" style="color:#eee; font-size:1.1em; margin:10px;"></p>' +
            '<button style="margin-top:10px; padding:8px 28px; background:#e94560; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer;" onclick="snakeRestart(\'' + sid + '\')">&#8634; Play Again</button>' +
            '</div>' +
            '</div>';
    }

    if (appName === 'Minecraft') {
        return `<iframe src="https://classic.minecraft.net" style="width:100%; height:100%; border:none;"></iframe>`;
    }
    if (appName === 'skribbl.io') {
        return `<iframe src="https://skribbl.io" style="width:100%; height:100%; border:none; background:#000;"></iframe>`;
    }
    if (appName === 'Geometry Dash Lite') {
        return `<iframe src="https://s.geometrydashgames.io/games/geometry-dash-lite/index.html" style="width:100%; height:100%; border:none; background:#000;"></iframe>`;
    }
    if (appName === 'Flappy Bird') {
        return `<iframe src="https://flappybird.io/" style="width:100%; height:100%; border:none; background:#000;"></iframe>`;
    }
    if (appName === 'VS Code') {
        return `<iframe src="https://github1s.com/AnupSharma12/AnupSharma12" style="width:100%; height:100%; border:none; background:#1e1e1e;"></iframe>`;
    }
    if (appName === 'Notepad') {
        return '<textarea style="width:100%; height:100%; border:none; outline:none; font-family:Consolas,monospace; font-size:14px; padding:10px; resize:none;" placeholder="Type some notes here..."></textarea>';
    }

    if (appName === 'Terminal') {
        var termId = 'term-' + winId;
        return '<div style="background:#0c0c0c; color:#cccccc; height:100%; padding:10px; font-family:Cascadia Code,Consolas,monospace; font-size:14px; display:flex; flex-direction:column; cursor:text;" onclick="document.getElementById(\'' + termId + '\').focus()">' +
            '<div id="' + termId + '-output" style="overflow-y:auto; flex:1; margin-bottom:10px;">' +
            '<div style="color:#fff; font-weight:bold;">WinOS Terminal</div>' +
            '<div>Copyright (C) WinOS. All rights reserved.</div>' +
            '<div style="color:#9bd59b;">Commands: cd, dir, ls, cls, help</div>' +
            '<br>' +
            '</div>' +
            '<div style="display:flex; align-items:center;">' +
            '<span id="' + termId + '-prompt" style="margin-right:8px; color:#189a18;">' + terminalPath + '></span>' +
            '<input id="' + termId + '" type="text" style="flex:1; background:transparent; border:none; color:#cccccc; outline:none; font-family:Cascadia Code,Consolas,monospace; font-size:14px;" onkeydown="handleTerminalCommand(event, \'' + termId + '\')" autofocus>' +
            '</div>' +
            '</div>';
    }

    if (appName === 'Settings') {
        return '<div id="settings-' + winId + '" class="settings-shell" data-settings-winid="' + winId + '" data-page="system">' +
            '<div class="settings-sidebar">' +
            '<div class="settings-search-container"><input type="text" class="settings-search-bar" placeholder="Find a setting"></div>' +
            '<div class="settings-profile">' +
            '<div class="settings-avatar">A</div>' +
            '<div>' +
            '<div class="settings-name">Anup Sharma</div>' +
            '<div class="settings-mail">anup@winos.local</div>' +
            '</div>' +
            '</div>' +
            '<button class="settings-nav-btn active" data-page="system" onclick="settingsSwitchPage(\'' + winId + '\', \'system\')"><span class="material-symbols-rounded settings-nav-icon">computer</span> System</button>' +
            '<button class="settings-nav-btn" data-page="personalization" onclick="settingsSwitchPage(\'' + winId + '\', \'personalization\')"><span class="material-symbols-rounded settings-nav-icon">palette</span> Personalization</button>' +
            '<button class="settings-nav-btn" data-page="windowsupdate" onclick="settingsSwitchPage(\'' + winId + '\', \'windowsupdate\')"><span class="material-symbols-rounded settings-nav-icon">update</span> Windows Update</button>' +
            '</div>' +
            '<div id="settings-main-' + winId + '" class="settings-main"></div>' +
            '</div>';
    }

    if (appName === 'Paint') {
        return '<div class="paint-shell">' +
            '<div class="paint-toolbar">' +
            '<div class="paint-group">' +
            '<button id="paint-tool-brush-' + winId + '" class="paint-tool-btn active" onclick="paintSetTool(\'' + winId + '\', \'brush\')">Brush</button>' +
            '<button id="paint-tool-eraser-' + winId + '" class="paint-tool-btn" onclick="paintSetTool(\'' + winId + '\', \'eraser\')">Eraser</button>' +
            '<button id="paint-tool-fill-' + winId + '" class="paint-tool-btn" onclick="paintSetTool(\'' + winId + '\', \'fill\')">Fill</button>' +
            '</div>' +
            '<div class="paint-group">' +
            '<label style="font-size:12px; color:#475467;">Size</label>' +
            '<input id="paint-size-' + winId + '" class="paint-size" type="range" min="1" max="32" value="6" oninput="paintSetSize(\'' + winId + '\', this.value)">' +
            '</div>' +
            '<div class="paint-group">' +
            '<label style="font-size:12px; color:#475467;">Color</label>' +
            '<input id="paint-color-' + winId + '" class="paint-color" type="color" value="#202020" oninput="paintSetColor(\'' + winId + '\', this.value)">' +
            '</div>' +
            '<div class="paint-group">' +
            '<button class="paint-action-btn" onclick="paintFill(\'' + winId + '\')">Fill canvas</button>' +
            '<button class="paint-action-btn" onclick="paintClear(\'' + winId + '\')">Clear</button>' +
            '<button class="paint-action-btn" onclick="paintSave(\'' + winId + '\')">Save PNG</button>' +
            '</div>' +
            '</div>' +
            '<div class="paint-stage">' +
            '<div id="paint-wrap-' + winId + '" class="paint-canvas-wrap">' +
            '<canvas id="paint-canvas-' + winId + '" class="paint-canvas" onmousedown="paintBegin(\'' + winId + '\', event)" onmousemove="paintMove(\'' + winId + '\', event)" onmouseup="paintStop(\'' + winId + '\')" onmouseleave="paintStop(\'' + winId + '\')"></canvas>' +
            '</div>' +
            '</div>' +
            '<div id="paint-status-' + winId + '" class="paint-status">Tool: brush • Size: 6px • Color: #202020</div>' +
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
        var inputId = frameId + '-input';
        return '<div style="height:100%; display:flex; flex-direction:column;">' +
            '<div style="display:flex; padding:8px; background:#f1f3f4; border-bottom:1px solid #ccc; align-items:center; gap:10px;">' +
            '<div style="display:flex; gap:5px;">' +
            '<button style="border:none; background:transparent; cursor:pointer; font-size:16px;" onclick="browserGoBack(\'' + frameId + '\')">⬅️</button>' +
            '<button style="border:none; background:transparent; cursor:pointer; font-size:16px;" onclick="browserGoForward(\'' + frameId + '\')">➡️</button>' +
            '<button style="border:none; background:transparent; cursor:pointer; font-size:16px;" onclick="browserReload(\'' + frameId + '\')">🔄</button>' +
            '</div>' +
            '<input id="' + inputId + '" type="text" value="https://en.wikipedia.org" style="flex:1; padding:6px 12px; border-radius:15px; border:1px solid #ddd; outline:none;" onkeydown="if(event.key===\'Enter\'){ browserNavigate(\'' + frameId + '\', \'' + inputId + '\', this.value); }">' +
            '</div>' +
            '<iframe id="' + frameId + '" src="https://en.wikipedia.org/wiki/Special:Random" style="flex:1; width:100%; border:none;" onload="browserInit(\'' + frameId + '\', \'' + inputId + '\')"></iframe>' +
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
            '<h2 style="color:#fff; font-size:1.2em; margin-bottom:10px;">Difficulty</h2>' +
            '<select id="' + gid + '-diff" style="margin-bottom:20px; padding:6px 12px; font-size:1em; border-radius:4px; border:none; outline:none; cursor:pointer; background:#fff; color:#333;">' +
            '<option value="easy">Easy</option>' +
            '<option value="medium">Medium</option>' +
            '<option value="hard">Hard</option>' +
            '<option value="impossible" selected>Impossible</option>' +
            '</select>' +
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
    var diffSelect = document.getElementById(gid + '-diff');
    var difficulty = diffSelect ? diffSelect.value : 'impossible';
    var g = {
        board: [[null, null, null], [null, null, null], [null, null, null]],
        playerMark: mark,
        aiMark: mark === 'X' ? 'O' : 'X',
        difficulty: difficulty,
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
        setTimeout(function () { tttGameOver(gid, mark); }, 1500);
    } else if (g.turnsPlayed >= 9) {
        setTimeout(function () { tttGameOver(gid, 'draw'); }, 1500);
    } else {
        g.playerTurn = !g.playerTurn;
        if (!g.playerTurn) tttAiPlay(gid);
    }
}

// AI makes its move using minimax, then displays a trash talk line
function tttAiPlay(gid) {
    setTimeout(function () {
        var g = tttGames[gid];
        if (!g || g.gameOver) return;

        var diff = g.difficulty || 'impossible';
        var moves = tttAvailableMoves(g);
        var useRandom = false;

        if (diff === 'easy') {
            useRandom = true;
        } else if (diff === 'medium') {
            useRandom = Math.random() < 0.5;
        } else if (diff === 'hard') {
            useRandom = Math.random() < 0.2;
        }

        if (useRandom && moves.length > 0) {
            var r = Math.floor(Math.random() * moves.length);
            g.nextMove = moves[r];
        } else {
            tttMinimax(g, 0);
        }

        tttMakePlay(gid, g.aiMark, g.nextMove[0], g.nextMove[1]);
        tttCheckPlay(gid, g.aiMark);

        // Flash a random trash talk message for 2 seconds
        var threat = document.getElementById(gid + '-threat');
        if (threat) {
            threat.textContent = tttThreats[Math.floor(Math.random() * tttThreats.length)];
            setTimeout(function () { if (threat) threat.textContent = ''; }, 2000);
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
    var title = document.getElementById(gid + '-endtitle');
    var sub = document.getElementById(gid + '-endsub');

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
    var grid = document.getElementById(gid + '-grid');
    var config = document.getElementById(gid + '-config');

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
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (!data.results || data.results.length === 0) {
                if (qEl) qEl.textContent = 'Failed to load questions. Try again.';
                return;
            }

            // Parse and shuffle each question's answer options
            var questions = [];
            for (var i = 0; i < data.results.length; i++) {
                var item = data.results[i];
                var correct = quizDecodeHTML(item.correct_answer);
                var opts = item.incorrect_answers.map(function (a) { return quizDecodeHTML(a); });

                // Insert the correct answer at a random position
                var correctIdx = Math.floor(Math.random() * (opts.length + 1));
                opts.splice(correctIdx, 0, correct);
                questions.push({ q: quizDecodeHTML(item.question), o: opts, a: correctIdx });
            }
            quizState[qid] = { idx: 0, score: 0, answered: false, questions: questions };
            quizShow(qid);
        })
        .catch(function () {
            if (qEl) qEl.textContent = 'Network error. Check connection and try again.';
        });
}

// Display the current question and its answer buttons
function quizShow(qid) {
    var s = quizState[qid];
    if (!s) return;
    s.answered = false;

    var q = s.questions[s.idx];
    var total = s.questions.length;
    var qEl = document.getElementById(qid + '-question');
    var oEl = document.getElementById(qid + '-options');
    var rEl = document.getElementById(qid + '-result');
    var nEl = document.getElementById(qid + '-next');
    var sEl = document.getElementById(qid + '-score');

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
            btn.onclick = (function (idx) { return function () { quizAnswer(qid, idx); }; })(i);
            oEl.appendChild(btn);
        }
    }
}

// Handle the player selecting an answer
function quizAnswer(qid, chosen) {
    var s = quizState[qid];
    if (!s || s.answered) return;
    s.answered = true;

    var q = s.questions[s.idx];
    var total = s.questions.length;
    var rEl = document.getElementById(qid + '-result');
    var nEl = document.getElementById(qid + '-next');
    var sEl = document.getElementById(qid + '-score');
    var oEl = document.getElementById(qid + '-options');
    var btns = oEl ? oEl.children : [];

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
        if (nEl) { nEl.textContent = 'Play Again'; nEl.onclick = function () { quizInit(qid); }; }
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

    var textEl = document.getElementById(tid + '-text');
    var inputEl = document.getElementById(tid + '-input');
    if (textEl) textEl.innerHTML = '<span style="color:#bdc3c7;">' + sentence + '</span>';
    if (inputEl) { inputEl.value = ''; inputEl.disabled = false; inputEl.focus(); }

    var wpmEl = document.getElementById(tid + '-wpm');
    var accEl = document.getElementById(tid + '-acc');
    var timeEl = document.getElementById(tid + '-time');
    if (wpmEl) wpmEl.textContent = '0';
    if (accEl) accEl.textContent = '100%';
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
        s.timer = setInterval(function () { typingTick(tid); }, 1000);
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
    iconDiv.innerHTML = '<img src="' + iconPath + '" onerror="this.src=\'./img/unknown.png\'">';

    // Click to restore a minimized window or bring it to the front
    iconDiv.onclick = function () {
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
        win.dataset.prevLeft = win.style.left;
        win.dataset.prevTop = win.style.top;
        win.dataset.prevWidth = win.style.width;
        win.dataset.prevHeight = win.style.height;

        win.style.left = '0px';
        win.style.top = '0px';
        win.style.width = '100%';
        win.style.height = 'calc(100% - 40px)';   // Leave room for the taskbar
        win.dataset.maximized = 'true';
    } else {
        // Restore to previous position/size
        win.style.left = win.dataset.prevLeft || '120px';
        win.style.top = win.dataset.prevTop || '50px';
        win.style.width = win.dataset.prevWidth || '850px';
        win.style.height = win.dataset.prevHeight || '560px';
        win.dataset.maximized = 'false';
    }

    setTimeout(function () { paintResize(winId); }, 40);
}

// Remove the window and its taskbar icon from the DOM
function closeApp(winId) {
    var win = document.getElementById(winId);
    var taskIcon = document.getElementById('task-' + winId);
    if (win) win.remove();
    if (taskIcon) taskIcon.remove();
}

// ========== Snake Game ==========
var snakeGames = {};

function snakeInit(sid) {
    var wrapper = document.getElementById(sid);
    var canvas = document.getElementById(sid + '-canvas');
    if (!wrapper || !canvas) return;

    var grid = 16;
    var cols = 25;
    var rows = 25;
    canvas.width = cols * grid;
    canvas.height = rows * grid;

    var g = {
        ctx: canvas.getContext('2d'),
        grid: grid,
        cols: cols,
        rows: rows,
        snake: { x: 10 * grid, y: 10 * grid, dx: grid, dy: 0, cells: [], maxCells: 4 },
        apple: { x: 0, y: 0 },
        score: 0,
        count: 0,
        running: true,
        raf: null
    };

    // Place apple randomly
    g.apple.x = Math.floor(Math.random() * cols) * grid;
    g.apple.y = Math.floor(Math.random() * rows) * grid;

    snakeGames[sid] = g;

    // Hide game-over overlay
    var overlay = document.getElementById(sid + '-overlay');
    if (overlay) overlay.style.display = 'none';

    // Update score display
    var scoreEl = document.getElementById(sid + '-score');
    if (scoreEl) scoreEl.textContent = 'Score: 0';

    // Keyboard handler scoped to this game instance
    if (!g._keyHandler) {
        g._keyHandler = function (e) {
            var game = snakeGames[sid];
            if (!game || !game.running) return;
            var s = game.snake;
            if (e.which === 37 && s.dx === 0) { s.dx = -game.grid; s.dy = 0; e.preventDefault(); }
            else if (e.which === 38 && s.dy === 0) { s.dy = -game.grid; s.dx = 0; e.preventDefault(); }
            else if (e.which === 39 && s.dx === 0) { s.dx = game.grid; s.dy = 0; e.preventDefault(); }
            else if (e.which === 40 && s.dy === 0) { s.dy = game.grid; s.dx = 0; e.preventDefault(); }
        };
        wrapper.addEventListener('keydown', g._keyHandler);
    }

    // Focus the wrapper so keys work
    wrapper.focus();

    // Start game loop
    function loop() {
        var game = snakeGames[sid];
        if (!game || !game.running) return;
        game.raf = requestAnimationFrame(loop);

        // Slow to ~10 fps
        if (++game.count < 6) return;
        game.count = 0;

        var ctx = game.ctx;
        var s = game.snake;
        var grd = game.grid;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Move snake
        s.x += s.dx;
        s.y += s.dy;

        // Wrap edges
        if (s.x < 0) s.x = canvas.width - grd;
        else if (s.x >= canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height - grd;
        else if (s.y >= canvas.height) s.y = 0;

        s.cells.unshift({ x: s.x, y: s.y });
        if (s.cells.length > s.maxCells) s.cells.pop();

        // Draw apple with glow
        ctx.shadowColor = '#e94560';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.arc(game.apple.x + grd / 2, game.apple.y + grd / 2, grd / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw snake
        for (var i = 0; i < s.cells.length; i++) {
            var cell = s.cells[i];

            // Gradient green for body, brighter head
            var g1 = i === 0 ? '#53d769' : '#2ecc71';
            ctx.fillStyle = g1;
            ctx.fillRect(cell.x, cell.y, grd - 1, grd - 1);

            // Ate apple
            if (cell.x === game.apple.x && cell.y === game.apple.y) {
                s.maxCells++;
                game.score += 10;
                var scoreEl = document.getElementById(sid + '-score');
                if (scoreEl) scoreEl.textContent = 'Score: ' + game.score;
                game.apple.x = Math.floor(Math.random() * game.cols) * grd;
                game.apple.y = Math.floor(Math.random() * game.rows) * grd;
            }

            // Self-collision
            for (var j = i + 1; j < s.cells.length; j++) {
                if (cell.x === s.cells[j].x && cell.y === s.cells[j].y) {
                    snakeGameOver(sid);
                    return;
                }
            }
        }
    }

    g.raf = requestAnimationFrame(loop);
}

function snakeGameOver(sid) {
    var g = snakeGames[sid];
    if (!g) return;
    g.running = false;
    if (g.raf) cancelAnimationFrame(g.raf);

    var overlay = document.getElementById(sid + '-overlay');
    var title = document.getElementById(sid + '-endtitle');
    var score = document.getElementById(sid + '-endscore');

    if (title) title.textContent = 'Game Over!';
    if (score) score.textContent = 'Final Score: ' + g.score;
    if (overlay) overlay.style.display = 'flex';
}

function snakeRestart(sid) {
    var g = snakeGames[sid];
    if (g && g.raf) cancelAnimationFrame(g.raf);
    snakeInit(sid);
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

// ========== Action Center (Quick Settings Panel) ==========
var acState = {
    wifi: true,
    bluetooth: true,
    airplane: false,
    saver: false,
    nightlight: false,
    location: false,
    brightness: 100,
    volume: 70,
    batteryLevel: 100,
    charging: true
};

function toggleActionCenter(e) {
    e.stopPropagation();
    var panel = document.getElementById('actionCenter');
    var calPanel = document.getElementById('calendarPanel');
    if (calPanel) calPanel.classList.add('hidden');
    panel.classList.toggle('hidden');
}

function toggleCalendar(e) {
    e.stopPropagation();
    var panel = document.getElementById('calendarPanel');
    var acPanel = document.getElementById('actionCenter');
    if (acPanel) acPanel.classList.add('hidden');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        renderCalendar();
    }
}

function acToggle(key) {
    acState[key] = !acState[key];
    var tile = document.getElementById('ac-' + key);
    if (tile) {
        if (acState[key]) {
            tile.classList.add('active');
        } else {
            tile.classList.remove('active');
        }
    }

    // Special behaviors
    if (key === 'airplane') {
        if (acState.airplane) {
            acState.wifi = false;
            acState.bluetooth = false;
            var wt = document.getElementById('ac-wifi');
            var bt = document.getElementById('ac-bluetooth');
            if (wt) wt.classList.remove('active');
            if (bt) bt.classList.remove('active');
        }
    }

    if (key === 'wifi' && acState.wifi && acState.airplane) {
        acState.airplane = false;
        var at = document.getElementById('ac-airplane');
        if (at) at.classList.remove('active');
    }

    if (key === 'nightlight') {
        if (acState.nightlight) {
            document.body.classList.add('nightlight-active');
        } else {
            document.body.classList.remove('nightlight-active');
        }
    }

    updateTaskbarSysIcons();
}

function acBrightness(val) {
    acState.brightness = parseInt(val, 10);
    var label = document.getElementById('ac-brightness-val');
    if (label) label.textContent = val + '%';
    // Simulate brightness by adjusting an overlay's opacity
    document.body.style.filter = acState.nightlight
        ? 'brightness(' + (val / 100) + ') sepia(0.25) saturate(1.3)'
        : 'brightness(' + (val / 100) + ')';
}

function acVolume(val) {
    acState.volume = parseInt(val, 10);
    var label = document.getElementById('ac-volume-val');
    if (label) label.textContent = val + '%';

    // Update audio icon based on level
    var level = 0;
    if (val > 66) level = 3;
    else if (val > 33) level = 2;
    else if (val > 0) level = 1;

    var acIcon = document.getElementById('ac-vol-icon');
    var tbIcon = document.getElementById('tb-audio-icon');
    if (acIcon) acIcon.src = './img/icon/ui/audio' + level + '.png';
    if (tbIcon) tbIcon.src = './img/icon/ui/audio' + level + '.png';
}

function updateTaskbarSysIcons() {
    var wifiIcon = document.getElementById('tb-wifi-icon');
    if (wifiIcon) {
        wifiIcon.style.opacity = acState.wifi ? '1' : '0.4';
    }
}

// Battery detection using the Battery API
function initBattery() {
    if (navigator.getBattery) {
        navigator.getBattery().then(function (bt) {
            function update() {
                acState.batteryLevel = Math.round(bt.level * 100);
                acState.charging = bt.charging;

                var pctEl = document.getElementById('ac-battery-pct');
                var statusEl = document.getElementById('ac-battery-status');
                if (pctEl) pctEl.textContent = acState.batteryLevel + '%';
                if (statusEl) statusEl.textContent = acState.charging ? 'Plugged in' : 'On battery';

                var battMini = document.querySelector('.tb-battery-mini');
                if (battMini) battMini.title = 'Battery: ' + acState.batteryLevel + '%' + (acState.charging ? ' (Charging)' : '');
            }
            update();
            bt.addEventListener('levelchange', update);
            bt.addEventListener('chargingchange', update);
        });
    }
}

// ========== Calendar Panel ==========
function renderCalendar() {
    var now = new Date();
    var timeEl = document.getElementById('cal-time');
    var dateEl = document.getElementById('cal-date');
    var gridEl = document.getElementById('cal-grid');

    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (dateEl) {
        dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    }

    if (!gridEl) return;

    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrev = new Date(year, month, 0).getDate();

    var html = '';
    var headers = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    for (var h = 0; h < headers.length; h++) {
        html += '<div class="cal-header">' + headers[h] + '</div>';
    }

    // Previous month trailing days
    for (var p = firstDay - 1; p >= 0; p--) {
        html += '<div class="cal-day other">' + (daysInPrev - p) + '</div>';
    }

    // Current month
    for (var d = 1; d <= daysInMonth; d++) {
        var cls = d === today ? 'cal-day today' : 'cal-day';
        html += '<div class="' + cls + '">' + d + '</div>';
    }

    // Next month leading days
    var totalCells = firstDay + daysInMonth;
    var remaining = (7 - (totalCells % 7)) % 7;
    for (var n = 1; n <= remaining; n++) {
        html += '<div class="cal-day other">' + n + '</div>';
    }

    gridEl.innerHTML = html;
}

// ========== System UI ==========

loadSavedWallpaper();
initBattery();

// Update the lock screen's time and date display
function updateLockClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    if (m < 10) m = '0' + m;

    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
    setTimeout(function () { lock.style.display = 'none'; }, 500);
}

// Start menu: toggle on button click, close on any outside click
document.getElementById('startBtn').onclick = function (e) {
    e.stopPropagation();
    document.getElementById('startMenu').classList.toggle('hidden');
};

document.onclick = function (e) {
    document.getElementById('startMenu').classList.add('hidden');

    // Close action center and calendar if clicking outside
    var ac = document.getElementById('actionCenter');
    var cal = document.getElementById('calendarPanel');
    var sysIcons = document.getElementById('tbSysIcons');
    var dtBlock = document.getElementById('tbDateTime');

    if (ac && !ac.contains(e.target) && sysIcons && !sysIcons.contains(e.target)) {
        ac.classList.add('hidden');
    }
    if (cal && !cal.contains(e.target) && dtBlock && !dtBlock.contains(e.target)) {
        cal.classList.add('hidden');
    }
};

// Taskbar clock: update the time and date display every second
function updateClock() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    if (minutes < 10) minutes = '0' + minutes;
    document.getElementById('clock').innerText = hours + ':' + minutes;

    var dateEl = document.getElementById('clock-date');
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString('en-US', { month: '2-digit', day: 'numeric', year: '2-digit' });
    }
}

setInterval(updateClock, 1000);
updateClock();
updateClock();