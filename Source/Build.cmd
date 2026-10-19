@echo off
pushd "%~dp0.."
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" @Source\Build.rsp
set "buildResult=%ERRORLEVEL%"
popd
exit /b %buildResult%
