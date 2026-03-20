@echo off
cd /d "%~dp0"
where python
if %errorlevel% == 0 (
    echo Starting server on port 8080...
    echo Open browser: http://localhost:8080
    echo Press Ctrl+C to stop.
    python -m http.server 8080
    pause
    goto :eof
)
where python3
if %errorlevel% == 0 (
    python3 -m http.server 8080
    pause
    goto :eof
)
where npx
if %errorlevel% == 0 (
    npx serve . -l 8080
    pause
    goto :eof
)
echo ERROR: Python or Node.js not found.
echo Install Python: https://www.python.org/downloads/
pause
