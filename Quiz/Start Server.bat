@echo off
pushd "%~dp0"

:: Launch Anaconda PowerShell, activate base env, start server
start "CondaServer" ^
 "%windir%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoExit -ExecutionPolicy ByPass -Command ^
 "& 'C:\Users\georg\anaconda3\shell\condabin\conda-hook.ps1'; conda activate 'C:\Users\georg\anaconda3'; python -m http.server 8000; Write-Host 'Press Ctrl+C to quit…'; pause"

:: Open your browser
start "" http://localhost:8000/index.html

popd
