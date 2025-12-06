# 🎨 Eletr0 Studio - Interface Guide

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Eletr0 Studio                                          ●  ●  ● │  ← Title Bar
├──┬──────────┬─────────────────────────────────────────┬────────┤
│  │          │  Tab1  │  Tab2  │  Tab3              │  │   AI   │
│  │  EXPL    ├─────────────────────────────────────────┤  Chat  │
│  │          │                                         │  Panel │
│A │  File1   │                                         │        │
│c │  File2   │          Monaco Editor                 │  💬     │
│t │  📁 src  │         (Code Editor Area)             │  Ask    │
│i │   App.js │                                         │  me     │
│v │   main   │                                         │  any-   │
│i │  📁 pub  │                                         │  thing  │
│t │          │                                         │        │
│y │          │                                         │        │
│  │          │                                         │  [Send]│
│B │  🔍      ├─────────────────────────────────────────┴────────┤
│a │  🌿      │  Terminal │ Output │ Problems │ Debug           │
│r │  ▶       ├─────────────────────────────────────────────────┤
│  │  📦      │  bash-3.2$ npm start                            │
│  │          │  > eletr0-studio@1.0.0 start                    │
│  │  💬      │  > ./start.sh                                   │
│  │  ⚙       │                                                  │
└──┴──────────┴──────────────────────────────────────────────────┤
│  main │ JavaScript │ UTF-8 │ LF │ Ln 42, Col 18              │  ← Status Bar
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Activity Bar (Left Edge)
```
┌──┐
│📄│  Explorer - Browse files and folders
├──┤
│🔍│  Search - Find in files
├──┤
│🌿│  Git - Source control
├──┤
│▶ │  Run & Debug
├──┤
│📦│  Extensions
├──┤
│💬│  AI Assistant (Chat with AI)
├──┤
│⚙ │  Settings
└──┘
```

**Click icons to switch views!**

---

### 2. Sidebar (Next to Activity Bar)
```
┌─────────────┐
│  EXPLORER   │  ← Active view name
├─────────────┤
│ 📁 + 🔄    │  ← Action buttons
├─────────────┤
│ 📁 src      │
│   ├─ App.jsx│
│   ├─ main.js│
│   └─ 📁 comp│
│ 📁 public   │
│   └─ index. │
│ 📄 README.md│
│ 📄 package. │
└─────────────┘
```

**Features:**
- Tree view navigation
- Create/delete files
- Right-click context menu
- Drag and drop (coming soon)

---

### 3. Editor Area (Center)
```
┌─────────────────────────────────────────────┐
│ App.jsx × │ main.js × │ styles.css ×       │  ← Tabs
├─────────────────────────────────────────────┤
│  1  import React from 'react';              │
│  2  import './App.css';                     │
│  3                                          │
│  4  function App() {                        │
│  5    return (                              │
│  6      <div className="App">               │
│  7        <h1>Hello World</h1>              │
│  8      </div>                              │
│  9    );                                    │
│ 10  }                                       │
│ 11                                          │  ← Line numbers
│ 12  export default App;                     │
│                                             │
│                                        ┌────┤
│                                        │Map │  ← Minimap
│                                        │    │
│                                        └────┤
└─────────────────────────────────────────────┘
```

**Features:**
- Multi-tab editing
- Syntax highlighting
- IntelliSense
- Find/Replace
- Minimap navigation

---

### 4. Panel (Bottom)
```
┌─────────────────────────────────────────────┐
│ Terminal │ Output │ Problems │ Debug        │  ← Panel tabs
├─────────────────────────────────────────────┤
│ bash-3.2$ npm run dev                       │
│ > eletr0-studio@1.0.0 dev                   │
│ > vite                                       │
│                                              │
│ VITE v5.4.21  ready in 2633 ms              │
│                                              │
│ ➜  Local:   http://localhost:3000/          │
│ ➜  press h + enter to show help             │
│                                              │
│                              Terminal 1 + ▼ │  ← Terminal controls
└─────────────────────────────────────────────┘
```

**Features:**
- Multiple terminals
- Color support
- Copy/paste
- Resize

---

### 5. Status Bar (Bottom)
```
┌─────────────────────────────────────────────┐
│ 🌿 main │ JavaScript │ UTF-8 │ Ln 42, Col 8│
└─────────────────────────────────────────────┘
   ↑        ↑            ↑        ↑
   Git      Language     Encoding  Position
```

**Shows:**
- Git branch
- File language
- Encoding
- Cursor position
- Selection info

---

### 6. AI Assistant Panel (Right)
```
┌────────────────────┐
│  AI Assistant   ×  │  ← Close button
├────────────────────┤
│                    │
│  🤖 Hello! I'm...  │
│     your AI coding │
│     assistant.     │
│                    │
│  👤 Create a...    │
│     React form     │
│                    │
│  🤖 Here's a form  │
│     component:     │
│     ```jsx         │
│     function Form()│
│     ...            │
│     ```            │
│                    │
│                    │
├────────────────────┤
│ [Ask me anything ] │  ← Input field
│                 📤 │  ← Send button
└────────────────────┘
```

**Use for:**
- Code generation
- Bug fixes
- Explanations
- Learning

---

## Color Scheme (Dark Theme)

```css
Background:    #1e1e1e  (Dark gray)
Sidebar:       #252526  (Slightly lighter)
Activity Bar:  #333333  (Medium gray)
Accent:        #007acc  (Blue)
Text:          #cccccc  (Light gray)
Border:        #454545  (Subtle gray)
```

---

## Icon Legend

| Icon | Meaning |
|------|---------|
| 📄 | File |
| 📁 | Folder (closed) |
| 📂 | Folder (open) |
| 🔍 | Search |
| 🌿 | Git/Branch |
| ▶️  | Run/Play |
| 📦 | Package/Extensions |
| 💬 | Chat/AI Assistant |
| ⚙️  | Settings |
| 🔄 | Refresh |
| ➕ | Add/Create |
| ❌ | Close/Delete |
| ✏️  | Edit |

---

## Keyboard Navigation

### File Explorer
- `↑/↓` - Navigate files
- `Enter` - Open file
- `Space` - Preview
- `Delete` - Delete file (with confirmation)

### Editor
- `Cmd/Ctrl + P` - Quick file open
- `Cmd/Ctrl + F` - Find
- `Cmd/Ctrl + H` - Replace
- `Cmd/Ctrl + /` - Toggle comment
- `Alt + ↑/↓` - Move line up/down
- `Cmd/Ctrl + D` - Select next occurrence

### Tabs
- `Cmd/Ctrl + Tab` - Next tab
- `Cmd/Ctrl + Shift + Tab` - Previous tab
- `Cmd/Ctrl + W` - Close tab

### Terminal
- `Cmd/Ctrl + \`` - Toggle terminal
- `Cmd/Ctrl + Shift + \`` - New terminal
- `Cmd/Ctrl + C` - Interrupt process
- `Cmd/Ctrl + V` - Paste

---

## UI States

### Normal Mode
```
[Editor is ready, cursor blinking]
Status: Ready
```

### File Modified
```
App.jsx ● (dot indicates unsaved)
Status: Modified
```

### Terminal Running
```
Terminal shows: $ npm start
Process running...
```

### AI Thinking
```
🤖 ... (typing indicator)
   ...
   ...
```

---

## Responsive Layout

The interface adapts to window size:

**Full Width (1400px+)**
```
Activity | Sidebar | Editor | AI Panel
```

**Medium Width (1000-1400px)**
```
Activity | Sidebar | Editor
(AI panel overlays)
```

**Small Width (<1000px)**
```
Activity | Editor
(Sidebar toggles)
```

---

## Customization Tips

### Hide/Show Panels

**Toggle Sidebar:** `Cmd/Ctrl + B`
```
With sidebar:     Without sidebar:
[A|S| Editor ]    [A| Editor    ]
```

**Toggle Terminal:** `Cmd/Ctrl + \``
```
With terminal:    Without terminal:
[ Editor    ]     [ Editor    ]
[ Terminal  ]     [           ]
```

**Toggle AI:** Click 💬 in Activity Bar
```
With AI:          Without AI:
[ Editor | AI]    [ Editor    ]
```

---

## Context Menus

### File Explorer Right-Click
```
┌─────────────────┐
│ Open            │
│ Rename       F2 │
│ Delete      Del │
│ ──────────────  │
│ Copy Path       │
│ Reveal in Finder│
└─────────────────┘
```

### Tab Right-Click
```
┌─────────────────┐
│ Close           │
│ Close Others    │
│ Close All       │
│ ──────────────  │
│ Copy Path       │
│ Reveal in Finder│
└─────────────────┘
```

---

## Visual Feedback

### Loading
```
[ ⏳ Loading... ]
```

### Success
```
[ ✅ File saved! ]
```

### Error
```
[ ❌ Error: File not found ]
```

### Info
```
[ ℹ️  Terminal created ]
```

---

## That's the Interface!

**Quick Recap:**
1. **Activity Bar** - Switch between views
2. **Sidebar** - File explorer, search, git
3. **Editor** - Write code with Monaco
4. **Panel** - Terminal and output
5. **Status Bar** - File information
6. **AI Assistant** - Your coding helper

**Start exploring!** 🚀
