// Global variables
const myWin = document.getElementById('win-main');
const myBody = document.getElementById('win-body');
const myTitle = document.getElementById('win-name');
const closeBtn = document.getElementById('close-it');

let isBig = false; // tracking if window is maximized

// Main function to open apps
function launch(what) {
    console.log("Launching: " + what); // human debugging lol
    myWin.classList.remove('hidden');

    if (what === 'notes') {
        myTitle.innerText = "Notepad";
        myBody.innerHTML = '<textarea style="width:100%; height:90%; border:none; outline:none;" placeholder="Type here..."></textarea>';
    } 
    
    else if (what === 'calc') {
        myTitle.innerText = "Calculator";
        // Making this look "under construction"
        myBody.innerHTML = `
            <div style="text-align:center; padding-top:40px;">
                <h2 style="color:#d9534f;">⚠️ UNDER DEVELOPMENT</h2>
                <p>I'm still figuring out the math logic for this. Check back later!</p>
            </div>
        `;
    }

    else if (what === 'browser') {
        // Human touch: Not Google Chrome name
        myTitle.innerText = "Not Google Chrome";
        myBody.innerHTML = `
            <div style="background:#f1f1f1; padding:5px; border-bottom:1px solid #ccc;">
                <input type="text" value="https://google.com" style="width:80%">
            </div>
            <div style="padding:20px; text-align:center;">
                <p>Cannot connect to the internet.</p>
                <button onclick="alert('Still no internet...')">Retry</button>
            </div>
        `;
    }

    else if (what === 'settings') {
        myTitle.innerText = "Settings";
        myBody.innerHTML = '<h3>WinOS Settings</h3><p>Wallpaper: Fixed</p><p>Dev: Anup</p>';
    }
}

// Close the window
closeBtn.onclick = function() {
    myWin.classList.add('hidden');
}

// Maximize toggle
function fullScreen() {
    if (!isBig) {
        myWin.style.width = '100%';
        myWin.style.height = 'calc(100vh - 40px)';
        myWin.style.top = '0';
        myWin.style.left = '0';
        isBig = true;
    } else {
        // Back to normal
        myWin.style.width = '550px';
        myWin.style.height = '380px';
        myWin.style.top = '10%';
        myWin.style.left = '20%';
        isBig = false;
    }
}

// Clock logic
function updateClock() {
    const d = new Date();
    let h = d.getHours();
    let m = d.getMinutes();
    if (m < 10) m = "0" + m; // teen fix for single digits
    document.getElementById('the-time').innerText = h + ":" + m;
}

setInterval(updateClock, 1000);
updateClock();

console.log("WinOS is ready. Don't hack me plz.");