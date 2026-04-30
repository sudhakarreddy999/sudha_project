@echo off
echo Starting AI Creative Art Prompt Generator...

echo.
echo Starting Server...
start "Server" cmd /k "python app.py"

echo.
echo Waiting for server to initialize...
timeout /t 3 /nobreak >nul

echo Opening the application in your browser...
start http://localhost:5000

echo.
echo The project is now running! You can close this window.
echo (To stop the server, simply close the newly opened terminal window)
