@echo off
setlocal
pushd "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node scripts/start-dev.mjs
) else if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/start-dev.mjs
) else (
  echo Node.js 24.15+ was not found. Install Node.js, then retry.
)
popd
echo.
echo The launcher has finished. Read any error above before closing.
pause
