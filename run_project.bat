@echo off
echo Starting AI Creative Art Prompt Generator...

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && python app.py"

echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && python -m http.server 8000"

echo.
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening the application in your browser...
start http://localhost:8000

echo.
echo The project is now running! You can close this window.
echo (To stop the servers, simply close the two newly opened terminal windows)
