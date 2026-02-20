@echo off
echo ============================================
echo   PUSH TO GITHUB
echo ============================================
echo.

cd /d "C:\Users\Toby2\Desktop\driver-timesheet-pro"

echo Checking Git status...
git status

echo.
echo Detecting current branch...
for /f "tokens=*" %%a in ('git branch --show-current') do set CURRENT_BRANCH=%%a
echo Current branch: %CURRENT_BRANCH%

echo.
echo Adding all changes...
git add .

echo.
echo Committing...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update: %date% %time%

git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
echo.
echo IMPORTANT: When prompted for password, use your Personal Access Token!
echo.

REM Push to the current branch (main, master, or whatever you're on)
git push origin %CURRENT_BRANCH%

if errorlevel 1 (
    echo.
    echo ERROR: Push failed!
    echo.
    echo Troubleshooting:
    echo 1. Check if branch '%CURRENT_BRANCH%' exists on remote
    echo 2. You may need to set upstream: git push -u origin %CURRENT_BRANCH%
    echo 3. Or check your internet connection and token permissions
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS! Pushed to %CURRENT_BRANCH%
echo ============================================
echo.
pause