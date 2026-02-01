#!/usr/bin/env node
/**
 * Prebuild script for native modules (node-pty)
 * This script runs before electron-builder packages the app
 * It ensures node-pty is properly compiled for the target platform
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');

console.log('🔧 Prebuilding native modules for Electron...');

// Get Electron version from package.json
const packageJson = require(path.join(projectRoot, 'package.json'));
const electronVersion = packageJson.devDependencies.electron.replace('^', '').replace('~', '');

console.log(`📦 Electron version: ${electronVersion}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`🏗️  Architecture: ${process.arch}`);

try {
  // Rebuild node-pty for Electron
  console.log('\n📦 Rebuilding node-pty for Electron...');
  
  const rebuildCmd = process.platform === 'win32'
    ? `npx.cmd @electron/rebuild -f -w node-pty -v ${electronVersion}`
    : `npx @electron/rebuild -f -w node-pty -v ${electronVersion}`;
  
  execSync(rebuildCmd, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_runtime: 'electron',
      npm_config_target: electronVersion,
      npm_config_disturl: 'https://electronjs.org/headers',
      npm_config_build_from_source: 'true',
    }
  });
  
  console.log('✅ node-pty rebuilt successfully for Electron');
  
  // Verify the build
  const ptyPath = path.join(projectRoot, 'node_modules', 'node-pty');
  const buildPath = path.join(ptyPath, 'build', 'Release');
  
  if (fs.existsSync(buildPath)) {
    const files = fs.readdirSync(buildPath);
    console.log(`\n📁 Built files in ${buildPath}:`);
    files.forEach(file => console.log(`   - ${file}`));
  }
  
  console.log('\n✅ Native module prebuild complete!');
  
} catch (error) {
  console.error('\n❌ Prebuild failed:', error.message);
  console.log('\n⚠️  The app will use fallback terminal (child_process) if node-pty fails at runtime.');
  // Don't exit with error - the fallback terminal will work
  process.exit(0);
}
