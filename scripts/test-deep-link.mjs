#!/usr/bin/env node

/**
 * Automated test for deep link authentication flow
 * 
 * Usage: npm run test:deep-link
 * 
 * This script:
 * 1. Builds the app (or uses existing build)
 * 2. Spawns the app binary
 * 3. Waits for app to be ready
 * 4. Sends a test deep link
 * 5. Monitors output for success markers
 * 6. Cleans up on exit
 */

import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import { setTimeout as delay } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const APP_BINARY = path.join(
  projectRoot,
  'src-tauri',
  'target',
  'release',
  'bundle',
  'macos',
  'Fluent Diary.app',
  'Contents',
  'MacOS',
  // NOTE: The executable name is the Rust crate name, not the app title
  'fluent-diary'
);

const TEST_DEEP_LINK = 'fluentwhisper://auth-callback?access_token=test_access_token_123&refresh_token=test_refresh_token_456';

// Success markers we're looking for
const SUCCESS_MARKERS = [
  '[TEST_SUCCESS]', // Our explicit test markers
  '[DeepLink][JS] App bundle loaded',
  '[AuthDeepLinkHandler] Credentials saved successfully'
];

// Timeouts
const APP_STARTUP_WAIT = 3000; // 3 seconds for app to start
const TEST_TIMEOUT = 20000; // 20 seconds total test timeout
const DEEP_LINK_DELAY = 3000; // 3 seconds after startup before sending link

function log(message, ...args) {
  console.log(`[TEST] ${message}`, ...args);
}

function error(message, ...args) {
  console.error(`[TEST ERROR] ${message}`, ...args);
}

async function checkBuildExists() {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('test', ['-f', APP_BINARY]);
    return true;
  } catch {
    return false;
  }
}

async function buildApp() {
  log('Building app...');
  try {
    const { stdout, stderr } = await execAsync('npm run tauri:build', {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    if (stderr) console.error(stderr);
    log('Build completed');
    return true;
  } catch (err) {
    error('Build failed:', err.message);
    return false;
  }
}

async function runTest() {
  log('Starting deep link test...');
  
  // Check if build exists
  const buildExists = await checkBuildExists();
  if (!buildExists) {
    log('App binary not found, building...');
    const buildSuccess = await buildApp();
    if (!buildSuccess) {
      error('Cannot proceed without a successful build');
      process.exit(1);
    }
  }
  
  log(`Spawning app: ${APP_BINARY}`);
  
  let successFound = false;
  let markersFound = [];
  let appProcess = null;
  let testTimeout = null;
  
  // Cleanup function
  const cleanup = () => {
    if (appProcess) {
      log('Cleaning up app process...');
      appProcess.kill('SIGTERM');
      // Force kill after 2 seconds if still running
      globalThis.setTimeout(() => {
        try {
          appProcess.kill('SIGKILL');
        } catch (e) {
          // Process already dead
        }
      }, 2000);
    }
    if (testTimeout) {
      clearTimeout(testTimeout);
    }
  };
  
  // Handle process exit
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
  
  return new Promise(async (resolve, reject) => {
    // Spawn the app and capture stdout/stderr
    appProcess = spawn(APP_BINARY, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    let outputBuffer = '';
    
    // Schedule sending the deep link after a fixed delay regardless of JS logs
    (async () => {
      await delay(APP_STARTUP_WAIT + DEEP_LINK_DELAY);
      log(`Sending test deep link: ${TEST_DEEP_LINK}`);
      try {
        await execAsync(`open \"${TEST_DEEP_LINK}\"`);
        log('Deep link sent successfully');
      } catch (err) {
        error('Failed to send deep link:', err.message);
      }
    })();

    // Collect stdout
    appProcess.stdout.on('data', (data) => {
      const text = data.toString();
      outputBuffer += text;
      process.stdout.write(text); // Also show in terminal
      
      // Check for success markers
      for (const marker of SUCCESS_MARKERS) {
        if (text.includes(marker) && !markersFound.includes(marker)) {
          markersFound.push(marker);
          log(`✓ Found success marker: ${marker}`);
          if (marker.includes('TEST_SUCCESS') || marker.includes('Credentials saved')) {
            successFound = true;
          }
        }
      }
      // no-op: JS console logs are not captured here
    });
    
    // Collect stderr
    appProcess.stderr.on('data', (data) => {
      const text = data.toString();
      outputBuffer += text;
      process.stderr.write(text);
      
      // Check for success markers in stderr too
      for (const marker of SUCCESS_MARKERS) {
        if (text.includes(marker) && !markersFound.includes(marker)) {
          markersFound.push(marker);
          log(`✓ Found success marker in stderr: ${marker}`);
          if (marker.includes('TEST_SUCCESS') || marker.includes('Credentials saved')) {
            successFound = true;
          }
        }
      }
    });
    
    appProcess.on('error', (err) => {
      error('Failed to spawn app:', err.message);
      reject(err);
    });
    
    appProcess.on('exit', (code, signal) => {
      log(`App exited with code ${code}, signal ${signal}`);
    });
    
    // Test timeout
    testTimeout = globalThis.setTimeout(() => {
      log('Test timeout reached');
      if (successFound) {
        log('✓ Test PASSED: Success marker found');
        log(`Found markers: ${markersFound.join(', ')}`);
        cleanup();
        resolve(true);
      } else {
        error('✗ Test FAILED: No success marker found within timeout');
        log(`Output captured:\n${outputBuffer}`);
        log(`Markers found: ${markersFound.length > 0 ? markersFound.join(', ') : 'none'}`);
        cleanup();
        resolve(false);
      }
    }, TEST_TIMEOUT);
    
    // If we found success early, resolve early
    const checkInterval = setInterval(() => {
      if (successFound) {
        clearInterval(checkInterval);
        log('✓ Test PASSED: Success marker found');
        log(`Found markers: ${markersFound.join(', ')}`);
        clearTimeout(testTimeout);
        globalThis.setTimeout(() => {
          cleanup();
          resolve(true);
        }, 1000); // Give a moment for final logs
      }
    }, 500);
  });
}

// Run the test
runTest()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    error('Test execution failed:', err);
    process.exit(1);
  });
