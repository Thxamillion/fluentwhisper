// Quick script to test the fix_vocab_lemmas command
// Run with: node fix_vocab.js

const { invoke } = require('@tauri-apps/api/core');

async function fixVocab() {
  try {
    console.log('Fixing Spanish vocabulary lemmas...');
    const fixedCount = await invoke('fix_vocab_lemmas', { language: 'es' });
    console.log(`✅ Fixed ${fixedCount} vocabulary entries`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// This won't work from Node.js - it needs to be called from the Tauri app
// We'll need to add a button in the UI or use the browser console
console.log('This needs to be run from the Tauri app browser console:');
console.log('await window.__TAURI__.invoke("fix_vocab_lemmas", { language: "es" })');
