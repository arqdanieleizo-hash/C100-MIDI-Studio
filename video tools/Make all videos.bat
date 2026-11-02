@echo off
rem Makes every draft video (ep01 ... ep12) that has its frames ready. Needs video tools\ffmpeg\bin\ffmpeg.exe
cd /d "%~dp0"
set "FF=%~dp0ffmpeg\bin\ffmpeg.exe"
if not exist "%FF%" ( echo ffmpeg.exe not found at %FF% & pause & exit /b )
for /d %%D in ("%~dp0out\ep*") do (
  if exist "%%D\list.txt" (
    echo Making %%~nxD ...
    "%FF%" -y -loglevel error -f concat -safe 0 -i "%%D\list.txt" -i "%%D\narration.wav" -vf "fps=8,format=yuv420p" -c:v libx264 -crf 24 -c:a aac -shortest "%%D\%%~nxD_draft.mp4"
  ) else if exist "%%D\make_video.bat" (
    echo %%~nxD already made with its own bat, skipping
  )
)
echo.
echo Done. The videos are in video tools\out\epNN\epNN_draft.mp4
pause
