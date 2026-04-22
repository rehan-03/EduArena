$ErrorActionPreference = 'Stop'
$judgeDir = "C:\vs code\DS_mini\judge-server"
$nodePath = "C:\Program Files\nodejs\node.exe"
$serverPath = "$judgeDir\src\server.js"

Write-Host "Starting Judge Server..."
Write-Host "Node: $nodePath"
Write-Host "Server: $serverPath"

$proc = Start-Process -FilePath $nodePath -ArgumentList $serverPath -WorkingDirectory $judgeDir -PassThru -WindowStyle Normal
Start-Sleep 3

if ($proc.HasExited) {
    Write-Host "Judge server failed to start (exit code: $($proc.ExitCode))"
    exit 1
} else {
    Write-Host "Judge server started with PID: $($proc.Id)"
    Write-Host "URL: http://localhost:3001"
}