@echo off
echo ============================================
echo   PUSH TO GITHUB
echo ============================================
echo.

cd /d "C:\Users\Toby2\Desktop\driver-timesheet-pro"

echo Checking Git status...
git status

echo.
echo Adding all changes...
git add .

echo.
echo Committing...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg="Update: %date% %time%"

git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
echo.
echo IMPORTANT: When prompted for password, use your Personal Access Token!
echo.

git push origin main

if errorlevel 1 (
    echo.
    echo Trying 'master' branch instead...
    git push origin master
)

echo.
echo ============================================
echo   DONE!
echo ============================================
echo.
pause