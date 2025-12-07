
REM ================================
REM CLI Agent Template
REM Available environment variables:
REM   $env:TRAYCER_PROMPT - The prompt to be executed (environment variable set by Traycer at runtime)
REM   $env:TRAYCER_PROMPT_TMP_FILE - Temporary file path containing the prompt content - useful for large prompts that exceed environment variable limits. Use commands like `cat $TRAYCER_PROMPT_TMP_FILE` to read and pass the prompt content to the CLI agent at runtime.
REM        Example: Get-Content -Raw $env:TRAYCER_PROMPT_TMP_FILE | CLI_AGENT_NAME
REM   $env:TRAYCER_TASK_ID - Traycer task identifier - use this when you want to use the same session on the execution agent across phase iterations, plans, and verification execution
REM   $env:TRAYCER_PHASE_BREAKDOWN_ID - Traycer phase breakdown identifier - use this when you want to use the same session for the current list of phases
REM   $env:TRAYCER_PHASE_ID - Traycer per phase identifier - use this when you want to use the same session for plan/review and verification
REM
REM NOTE: This template uses PowerShell syntax ($env:) by default.
REM
REM For other terminals, clone this template and modify as follows:
REM   Git Bash: $TRAYCER_PROMPT, $TRAYCER_PROMPT_TMP_FILE, $TRAYCER_TASK_ID, $TRAYCER_PHASE_BREAKDOWN_ID, $TRAYCER_PHASE_ID
REM
REM CMD is not supported at the moment.
REM ================================

opencode run "$env:TRAYCER_PROMPT"
