export const templates = {
  website: {
    html: {
      name: 'HTML Website',
      description: 'Simple HTML, CSS, and JavaScript website',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <h1>My Website</h1>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section id="home">
            <h2>Welcome</h2>
            <p>This is a simple website template.</p>
        </section>
        
        <section id="about">
            <h2>About</h2>
            <p>Tell your story here.</p>
        </section>
        
        <section id="contact">
            <h2>Contact</h2>
            <form id="contactForm">
                <input type="text" placeholder="Name" required>
                <input type="email" placeholder="Email" required>
                <textarea placeholder="Message" required></textarea>
                <button type="submit">Send</button>
            </form>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2025 My Website. All rights reserved.</p>
    </footer>
    
    <script src="script.js"></script>
</body>
</html>`,
        'styles.css': `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    background: #007acc;
    color: white;
    padding: 1rem 0;
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
}

nav {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

nav ul {
    list-style: none;
    display: flex;
    gap: 2rem;
}

nav a {
    color: white;
    text-decoration: none;
    transition: opacity 0.3s;
}

nav a:hover {
    opacity: 0.8;
}

main {
    max-width: 1200px;
    margin: 80px auto 0;
    padding: 2rem;
}

section {
    margin: 4rem 0;
    padding: 2rem;
}

section h2 {
    margin-bottom: 1rem;
    color: #007acc;
}

form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 500px;
}

input, textarea {
    padding: 0.8rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
}

button {
    padding: 0.8rem 2rem;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.3s;
}

button:hover {
    background: #005a9e;
}

footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 2rem;
    margin-top: 4rem;
}`,
        'script.js': `// Form submission
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Form submitted! (This is just a demo)');
    this.reset();
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

console.log('Website loaded successfully!');`,
      },
    },
    react: {
      name: 'React Website',
      description: 'Modern React application with Vite',
      files: {
        'package.json': JSON.stringify({
          name: 'react-app',
          version: '1.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            '@vitejs/plugin-react': '^4.2.0',
            vite: '^5.0.0',
          },
        }, null, 2),
        'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
        'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
        'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
        'src/App.jsx': `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React</h1>
        <p>Edit src/App.jsx and save to test HMR</p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
        </div>
      </header>
    </div>
  )
}

export default App`,
        'src/App.css': `.App {
  text-align: center;
}

.App-header {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}`,
        'src/index.css': `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
      },
    },
  },
  mobile: {
    reactNative: {
      name: 'React Native App',
      description: 'Cross-platform mobile app with React Native',
      files: {
        'package.json': JSON.stringify({
          name: 'MobileApp',
          version: '1.0.0',
          main: 'index.js',
          scripts: {
            start: 'react-native start',
            android: 'react-native run-android',
            ios: 'react-native run-ios',
          },
          dependencies: {
            react: '^18.2.0',
            'react-native': '^0.72.0',
          },
        }, null, 2),
        'App.js': `import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome to React Native!</Text>
        <Text style={styles.subtitle}>
          Edit App.js to change this screen
        </Text>
        
        <View style={styles.card}>
          <Text style={styles.counterText}>Counter: {count}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setCount(count + 1)}
          >
            <Text style={styles.buttonText}>Increment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setCount(0)}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007acc',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 300,
    padding: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    backgroundColor: '#007acc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});`,
        'index.js': `import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);`,
        'app.json': JSON.stringify({
          name: 'MobileApp',
          displayName: 'Mobile App',
        }, null, 2),
      },
    },
  },
  game: {
    canvas: {
      name: 'HTML5 Canvas Game',
      description: 'Simple game using HTML5 Canvas',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas Game</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="game-container">
        <h1>Simple Canvas Game</h1>
        <div class="controls">
            <p>Use ARROW KEYS to move</p>
            <p>Score: <span id="score">0</span></p>
        </div>
        <canvas id="gameCanvas" width="800" height="600"></canvas>
        <button id="restartBtn">Restart Game</button>
    </div>
    <script src="game.js"></script>
</body>
</html>`,
        'styles.css': `body {
    margin: 0;
    padding: 20px;
    font-family: Arial, sans-serif;
    background: #1a1a2e;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

.game-container {
    text-align: center;
}

h1 {
    margin-bottom: 20px;
    color: #00d4ff;
}

.controls {
    margin-bottom: 10px;
    font-size: 14px;
}

#gameCanvas {
    border: 3px solid #00d4ff;
    background: #16213e;
    display: block;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

#restartBtn {
    margin-top: 20px;
    padding: 12px 30px;
    font-size: 16px;
    background: #00d4ff;
    color: #1a1a2e;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: transform 0.2s;
}

#restartBtn:hover {
    transform: scale(1.05);
}`,
        'game.js': `const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');

class Game {
  constructor() {
    this.player = {
      x: canvas.width / 2 - 15,
      y: canvas.height - 50,
      width: 30,
      height: 30,
      speed: 5,
      color: '#00d4ff'
    };
    
    this.obstacles = [];
    this.score = 0;
    this.gameOver = false;
    this.keys = {};
    
    this.init();
  }
  
  init() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
    
    restartBtn.addEventListener('click', () => {
      game = new Game();
    });
    
    this.spawnObstacle();
    this.update();
  }
  
  spawnObstacle() {
    if (this.gameOver) return;
    
    const obstacle = {
      x: Math.random() * (canvas.width - 30),
      y: -30,
      width: 30,
      height: 30,
      speed: 2 + Math.random() * 2,
      color: '#ff4757'
    };
    
    this.obstacles.push(obstacle);
    setTimeout(() => this.spawnObstacle(), 1000);
  }
  
  update() {
    if (this.gameOver) {
      this.drawGameOver();
      return;
    }
    
    // Clear canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update player
    if (this.keys['ArrowLeft'] && this.player.x > 0) {
      this.player.x -= this.player.speed;
    }
    if (this.keys['ArrowRight'] && 
        this.player.x < canvas.width - this.player.width) {
      this.player.x += this.player.speed;
    }
    if (this.keys['ArrowUp'] && this.player.y > 0) {
      this.player.y -= this.player.speed;
    }
    if (this.keys['ArrowDown'] && 
        this.player.y < canvas.height - this.player.height) {
      this.player.y += this.player.speed;
    }
    
    // Draw player
    ctx.fillStyle = this.player.color;
    ctx.fillRect(this.player.x, this.player.y, 
                 this.player.width, this.player.height);
    
    // Update and draw obstacles
    this.obstacles = this.obstacles.filter(obstacle => {
      obstacle.y += obstacle.speed;
      
      ctx.fillStyle = obstacle.color;
      ctx.fillRect(obstacle.x, obstacle.y, 
                   obstacle.width, obstacle.height);
      
      // Check collision
      if (this.checkCollision(this.player, obstacle)) {
        this.gameOver = true;
      }
      
      // Remove if off screen
      if (obstacle.y > canvas.height) {
        this.score += 10;
        scoreElement.textContent = this.score;
        return false;
      }
      
      return true;
    });
    
    requestAnimationFrame(() => this.update());
  }
  
  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }
  
  drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.fillStyle = '#00d4ff';
    ctx.font = '24px Arial';
    ctx.fillText(\`Final Score: \${this.score}\`, 
                 canvas.width / 2, canvas.height / 2 + 30);
  }
}

let game = new Game();`,
      },
    },
  },
};
