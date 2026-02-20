@echo off
echo ============================================
echo   GIT SETUP FOR DRIVER TIMESHEET PRO
echo ============================================
echo.

cd /d "C:\Users\Toby2\Desktop\driver-timesheet-pro"

echo Checking if Git is installed...
git --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Git is not installed!
    echo Please download from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo Git is installed!
echo.

echo Setting up Git configuration...
git config --global user.name "twmiddleton21-lgtm"
git config --global user.email "twmiddleton21@gmail.com"

echo Initializing repository...
git init

echo Adding remote origin...
git remote add origin https://github.com/twmiddleton21-lgtm/driver-timesheet-pro.git

echo.
echo ============================================
echo   ADDING FILES TO GIT
echo ============================================
echo.

git add .

echo Committing files...
git commit -m "Initial commit: Refactored modular JS app with global objects"

echo.
echo ============================================
echo   READY TO PUSH!
echo ============================================
echo.
echo Next step: Run push-to-github.bat
echo.
echo NOTE: You'll need a Personal Access Token as your password.
echo See: https://github.com/settings/tokens
echo.
pause