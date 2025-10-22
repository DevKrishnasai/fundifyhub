# WhatsApp Session Troubleshooting

## Common Issue: EBUSY - Resource Busy or Locked

### Error Message
```
Error: EBUSY: resource busy or locked, unlink 'D:\Projects\fundifyhub\apps\job-worker\.wwebjs_auth\session-fundifyhub-admin-frontend\Default\Cookies'
```

### Why This Happens

This error occurs on Windows when:
1. **Chrome/Chromium process is still running** - The WhatsApp Web.js client uses Puppeteer, which launches Chrome. Sometimes these processes don't close properly.
2. **Previous session didn't close cleanly** - If the server crashed or was force-stopped, session files remain locked.
3. **Multiple instances running** - Two job-worker instances trying to access the same session.
4. **Windows file locking** - Windows holds locks on files longer than Unix systems.

### Solutions

#### Solution 1: Use the Cleanup Script (Recommended)
```bash
# Navigate to job-worker directory
cd apps/job-worker

# Run the cleanup script
npm run cleanup:whatsapp

# Or with pnpm
pnpm cleanup:whatsapp

# Then restart
turbo dev
```

The cleanup script will:
- Check for running processes
- Forcefully remove locked session files
- Use Windows-specific commands for stubborn locks
- Provide manual cleanup instructions if needed

#### Solution 2: Manual Cleanup

1. **Stop all Node processes**
   ```powershell
   # Windows PowerShell
   Get-Process node | Stop-Process -Force
   Get-Process chrome | Stop-Process -Force
   ```

2. **Delete session folder**
   ```powershell
   # Windows PowerShell
   Remove-Item -Path "apps\job-worker\.wwebjs_auth" -Recurse -Force
   ```

3. **Restart the server**
   ```bash
   turbo dev
   ```

#### Solution 3: Task Manager
1. Open Task Manager (Ctrl + Shift + Esc)
2. End all `node.exe` processes
3. End all `chrome.exe` processes related to your project
4. Delete the `.wwebjs_auth` folder manually
5. Restart

### Prevention

The codebase now includes these preventive measures:

1. **Timeouts on cleanup** - Logout and destroy operations timeout after 5 seconds
2. **Graceful shutdown** - Proper SIGTERM/SIGINT handlers
3. **Delay after cleanup** - 2-second wait after destroying client (Windows file lock release time)
4. **Error resilience** - EBUSY errors no longer crash the entire worker
5. **Sequential cleanup** - Logout → Destroy → Wait → Create new instance

### Best Practices

1. **Always use `turbo dev`** instead of manually starting individual services
2. **Don't force-kill processes** - Use Ctrl+C for graceful shutdown
3. **One instance only** - Don't run multiple job-workers simultaneously
4. **Clean shutdown** - Wait for "Job worker server stopped gracefully" message

### Check If Session Files Are Locked

```powershell
# Windows PowerShell - Check which process has the file open
# Install SysInternals Handle if not installed
# Download: https://learn.microsoft.com/en-us/sysinternals/downloads/handle

handle.exe "D:\Projects\fundifyhub\apps\job-worker\.wwebjs_auth"
```

### Still Having Issues?

If the cleanup script doesn't work:

1. **Restart your computer** - This releases all file locks
2. **Check antivirus** - Some antivirus software locks files for scanning
3. **Check file permissions** - Ensure you have write access to the directory
4. **Use Safe Mode** - Boot Windows in Safe Mode to remove stubborn locks

### Related Files
- Cleanup script: `scripts/cleanup-whatsapp-session.js`
- Service code: `src/services/otp-service.ts` (destroyWhatsApp function)
- Server error handling: `src/server.ts`
