@setlocal
@call "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" amd64 >nul 2>&1
c:\harbour\bin\win\msvc64\hbmk2 src\vibeos.prg -ovibeos -comp=msvc64 -std hbtip.hbc
@endlocal
@if exist vibeos.exe echo BUILD OK
@if exist vibeos.exe dir vibeos.exe
