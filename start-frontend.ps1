$ErrorActionPreference = 'Stop'
$frontendDir = "C:\vs code\DS_mini\frontend"
$npmPath = "C:\Program Files\nodejs\npm.cmd"
$npxPath = "C:\Program Files\nodejs\npx.cmd"

Write-Host "Starting Frontend..."
$proc = Start-Process -FilePath $npxPath -ArgumentList "vite --port 3000 --host" -WorkingDirectory $frontendDir -PassThru -WindowStyle Normal
Start-Sleep 5

if ($proc.HasExited) {
    Write-Host "Frontend failed to start"
    exit 1
} else {
    Write-Host "Frontend started with PID: $($proc.Id)"
    Write-Host "URL: http://localhost:3000"
}

Start-Sleep 10