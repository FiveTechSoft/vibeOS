# VibeOS

**AI-hallucinated Windows XP desktop — running entirely in the browser.**

👉 **[Launch VibeOS](https://fivetechsoft.github.io/vibeOS/)**

---

An operating system simulator where every application is generated on-the-fly by DeepSeek AI. Double-click desktop icons, use the Start menu, right-click for context menus — just like a real OS, but apps are hallucinated.

### Built-in Apps
- 📝 Notepad &nbsp; 🧮 Calculator &nbsp; 📁 File Explorer &nbsp; ⬛ Command Prompt &nbsp; 🌐 Internet Explorer
- 🎨 Paint (toolbox + color palette) &nbsp; 💣 Minesweeper (playable 9×9 grid)

### Features
- **Start → Run...** — type any app name, DeepSeek generates it live
- **Right-click desktop** — context menu with Style submenu
- **3 themes** — Windows XP · Mac OS · Apple Lisa
- **Window management** — drag, resize, minimize, maximize, close
- **Rubber-band selection** on desktop
- No server needed — pure HTML/CSS/JS, hosted on GitHub Pages

### Files
```
index.html    — XP desktop shell
xp.css        — Luna theme + Mac + Lisa styles
xp.js         — window behaviors (menus, drag, resize, selection)
vibe.js       — app logic, templates, DeepSeek API
```
