# 🪟 WinOS

**Windows 11 rebuilt from scratch in the browser.**

I made this as a love letter to Windows 11. I wanted to recreate the desktop experience using just HTML, CSS and JavaScript. I did not use React or any other frameworks. I did not even use a build pipeline. You can just open the `index.html` file. It will work.

---

## What's inside

### The desktop stuff you'd expect

You get a desktop where you can drag windows around minimize them maximize them and close them. There is a taskbar that shows which apps are running. There is a Start Menu where you can search for apps. You can also right-click on things to get a menu.. You can even change your wallpaper. It feels like Windows because it is basically Windows,. It is running in a web browser.

### A deep File Explorer

This took me a while to make. The File Explorer has a toolbar with lots of options. You can go back and forward. Even type in the address bar. There is a sidebar with access to your files and folders. And there is a virtual C: drive where you can store your files. You can use keyboard shortcuts like Backspace to go up a folder and Alt+Arrow to navigate through your history.

### Action Center & Quick Settings

If you click on the system tray you can turn Wi-Fi, Bluetooth and other things on and off. You can also adjust the brightness and volume. The brightness actually works by using a CSS filter.. The Night Light feature adds a warm tone to everything. The battery level is even pulled from the Web Battery API.

### 18 built-in apps

| App | What it does |

|-----|-------------|

📝 Notepad | A text editor where you can save files |

🧮 Calculator | A fully working calculator |

| 📁 Explorer. The deep file browser I described above |

| 🌐 Browser | A web browser that is embedded in the app |

| 🖥️ Terminal | A command line interface where you can type commands |

| ⚙ Settings | A place where you can see system info and change your wallpaper |

| 🎨 Paint A drawing app where you can make art |

| 🎵 Spotify | A music player that is embedded right in the app |

❌⭕ TicTacToe | A game of Tic Tac Toe that you can play with a friend |

| ⛏ Minecraft | A version of Minecraft that you can play right in the app |

| ❓ Quiz | A quiz game that you can play to test your knowledge |

| ⌨️ Typing | A typing speed test where you can see how fast you can type |

| 💻 Cheats++ | A utility that gives you cheats for games |

| 🐍 Snake | A game of Snake |

| 🆚 VS Code | A version of the VS Code editor that you can use right in the app

| 🎨 skribbl.io | A drawing game that you can play with people |

| 🟦 Geometry Dash | A version of the game Geometry Dash that you can play right in the app |

| 🐦 Flappy Bird A version of the game Flappy Bird that you can play right in the app |

---

## Tech stack

I used only the basics to make this. I used HTML5 to structure everything CSS3 to make it look nice and JavaScript to make it all work. I did not use any frameworks or dependencies. The icons are from the Win11React project.

---

## Getting started

You do not need to do anything to get started. You can just clone the repository. Open the `index.html` file.

```bash

git clone https://github.com/AnupSharma12/WinOS.git

cd WinOS

```

Then you can just open the `index.html` file in your web browser. If you need to use iframes you can use a server to run it.

```bash

npx http-server.

# open http://localhost:8080

```

---

## Contributing

If you find a bug or have an idea, for an app you can contribute to the project.

1. Fork the repository

2. Create a branch: `git checkout -b feature/NewApp`

3. Commit your changes: `git commit -m 'Add custom App'`

4. Push your changes. Open a Pull Request

You can check the issues page to see what needs to be done.

---

## License

This project is source and free to use.
