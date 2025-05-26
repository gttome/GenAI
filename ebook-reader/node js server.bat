@echo off
REM Batch file to start http-server and open the audiobook reader

REM Get the directory of the current batch file
set SCRIPT_DIR=%~dp0

REM Change the current directory to where the batch file is located
pushd "%SCRIPT_DIR%"

echo Starting Node.js http-server...
echo If http-server is not installed, run: npm install -g http-server

REM Start http-server in a new command window.
REM -p 5600 sets the port to 5600.
REM -c-1 disables caching, which is good for development.
REM "HTTP Server" will be the title of the new command window.
start "HTTP Server" cmd /k "http-server -p 5600 -c-1 && echo Server running. Press Ctrl+C in this window to stop."

echo Waiting for server to start...
REM Give the server a few seconds to start up. Adjust if needed.
timeout /t 3 /nobreak > nul

echo Opening Generative AI Prompt Guide Reader in your default browser...
REM Open index.html at the specified port
start "" http://localhost:5600/index-test-2.html

echo.
echo The http-server is running in a separate window.
echo You can close this batch file window.
echo To stop the server, close the "HTTP Server" command window or press Ctrl+C in it.

REM Return to the original directory (optional, good practice)
popd

REM Pause to see messages if run directly by double-clicking, can be removed.
REM pause
