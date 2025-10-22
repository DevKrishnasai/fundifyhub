/**
 * WhatsApp Session Cleanup Script
 * 
 * This script forcefully removes WhatsApp Web.js session files.
 * Use this when you encounter "EBUSY: resource busy or locked" errors.
 * 
 * Run with: node scripts/cleanup-whatsapp-session.js
 */

const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '..', '.wwebjs_auth');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function forceRemoveDir(dirPath, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(dirPath)) {
        console.log(`🗑️  Attempt ${i + 1}/${retries}: Removing ${dirPath}...`);
        
        // On Windows, we need to be more aggressive
        if (process.platform === 'win32') {
          // Use rmdir /s /q on Windows for force deletion
          const { execSync } = require('child_process');
          try {
            execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'inherit' });
            console.log('✅ Successfully removed directory using Windows rmdir');
            return;
          } catch (cmdError) {
            console.warn('⚠️  Windows rmdir failed, trying fs.rmSync...');
          }
        }
        
        // Fallback to Node.js fs
        fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
        console.log('✅ Successfully removed directory');
        return;
      } else {
        console.log('ℹ️  Session directory does not exist');
        return;
      }
    } catch (error) {
      console.error(`❌ Attempt ${i + 1} failed:`, error.message);
      
      if (i < retries - 1) {
        const waitTime = (i + 1) * 1000; // Progressive backoff
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
      }
    }
  }
  
  console.error('❌ Failed to remove directory after all retries');
  console.log('\n⚠️  Manual cleanup required:');
  console.log(`   1. Close all Node.js and Chrome processes`);
  console.log(`   2. Manually delete: ${dirPath}`);
  console.log(`   3. Restart the job-worker`);
  process.exit(1);
}

async function cleanup() {
  console.log('🧹 WhatsApp Session Cleanup Script');
  console.log('═'.repeat(50));
  console.log(`📂 Session directory: ${SESSION_DIR}\n`);

  // Check for running processes
  console.log('🔍 Checking for running processes...');
  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    try {
      const nodeProcesses = execSync('tasklist | findstr node.exe', { encoding: 'utf8' });
      if (nodeProcesses.trim()) {
        console.log('⚠️  Warning: Node.js processes are running:');
        console.log(nodeProcesses);
        console.log('\n💡 Consider stopping the job-worker first: npm run stop\n');
      }
    } catch (error) {
      // No node processes found, which is good
    }
  }

  await forceRemoveDir(SESSION_DIR);
  
  console.log('\n✅ Cleanup completed successfully!');
  console.log('💡 You can now restart the job-worker');
}

cleanup().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
