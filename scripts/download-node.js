#!/usr/bin/env node

/**
 * Downloads and bundles Node.js for the target platform
 * This allows ExternAI to work without users installing Node.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Node.js version to bundle (LTS)
const NODE_VERSION = '20.11.0';

// Platform configurations
const PLATFORMS = {
  'darwin-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    extract: 'tar',
    binPath: 'bin/node',
    npmPath: 'bin/npm'
  },
  'darwin-arm64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    extract: 'tar',
    binPath: 'bin/node',
    npmPath: 'bin/npm'
  },
  'win32-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    extract: 'zip',
    binPath: 'node.exe',
    npmPath: 'npm.cmd'
  },
  'linux-x64': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz`,
    extract: 'tar',
    binPath: 'bin/node',
    npmPath: 'bin/npm'
  }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading: ${url}`);
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (response2) => {
          response2.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadNodeForPlatform(platform) {
  const config = PLATFORMS[platform];
  if (!config) {
    console.error(`❌ Unknown platform: ${platform}`);
    return false;
  }

  const bundledDir = path.join(__dirname, '..', 'bundled-node', platform);
  const archiveExt = config.extract === 'zip' ? '.zip' : '.tar.gz';
  const archivePath = path.join(__dirname, '..', 'bundled-node', `node-${platform}${archiveExt}`);

  // Create directories
  fs.mkdirSync(bundledDir, { recursive: true });

  try {
    // Download
    await downloadFile(config.url, archivePath);
    console.log(`✅ Downloaded Node.js for ${platform}`);

    // Extract
    console.log(`📦 Extracting...`);
    if (config.extract === 'tar') {
      execSync(`tar -xzf "${archivePath}" -C "${bundledDir}" --strip-components=1`, { stdio: 'inherit' });
    } else if (config.extract === 'zip') {
      if (process.platform === 'win32') {
        execSync(`powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${bundledDir}' -Force"`, { stdio: 'inherit' });
        // Move files from nested folder
        const nested = fs.readdirSync(bundledDir).find(f => f.startsWith('node-'));
        if (nested) {
          const nestedPath = path.join(bundledDir, nested);
          fs.readdirSync(nestedPath).forEach(file => {
            fs.renameSync(path.join(nestedPath, file), path.join(bundledDir, file));
          });
          fs.rmdirSync(nestedPath);
        }
      } else {
        execSync(`unzip -o "${archivePath}" -d "${bundledDir}"`, { stdio: 'inherit' });
        // Move files from nested folder
        const nested = fs.readdirSync(bundledDir).find(f => f.startsWith('node-'));
        if (nested) {
          execSync(`mv "${path.join(bundledDir, nested)}"/* "${bundledDir}"/`, { stdio: 'inherit' });
          execSync(`rm -rf "${path.join(bundledDir, nested)}"`, { stdio: 'inherit' });
        }
      }
    }

    // Cleanup archive
    fs.unlinkSync(archivePath);

    // Verify installation
    const nodeBin = path.join(bundledDir, config.binPath);
    if (fs.existsSync(nodeBin)) {
      console.log(`✅ Node.js bundled successfully for ${platform}`);
      
      // Make executable on Unix
      if (process.platform !== 'win32') {
        execSync(`chmod +x "${nodeBin}"`);
      }
      
      return true;
    } else {
      console.error(`❌ Node binary not found at ${nodeBin}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to bundle Node.js for ${platform}:`, error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    // Download for all platforms
    console.log('📦 Downloading Node.js for all platforms...\n');
    for (const platform of Object.keys(PLATFORMS)) {
      await downloadNodeForPlatform(platform);
      console.log('');
    }
  } else if (args.includes('--current')) {
    // Download for current platform only
    const platform = `${process.platform}-${process.arch}`;
    console.log(`📦 Downloading Node.js for current platform (${platform})...\n`);
    await downloadNodeForPlatform(platform);
  } else if (args[0]) {
    // Download for specific platform
    await downloadNodeForPlatform(args[0]);
  } else {
    console.log(`
Usage: node download-node.js [options]

Options:
  --all           Download Node.js for all platforms
  --current       Download Node.js for current platform only
  <platform>      Download for specific platform (darwin-x64, darwin-arm64, win32-x64, linux-x64)

Examples:
  node download-node.js --current
  node download-node.js darwin-arm64
  node download-node.js --all
`);
  }
}

main().catch(console.error);
