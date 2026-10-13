param(
    [string]$Model = 'qwen3.5:4b'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local-ai'
$ollamaExe = Join-Path $localRoot 'runtime\ollama.exe'
$modelsPath = Join-Path $localRoot 'models'
$temporaryPath = Join-Path $localRoot 'tmp'

if (-not (Test-Path -LiteralPath $ollamaExe)) {
    throw "Ollama executable not found at $ollamaExe"
}

New-Item -ItemType Directory -Force -Path $modelsPath, $temporaryPath | Out-Null
$env:OLLAMA_MODELS = $modelsPath
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_CONTEXT_LENGTH = '4096'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_KEEP_ALIVE = '10m'
$env:TEMP = $temporaryPath
$env:TMP = $temporaryPath

try {
    $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2
    Write-Host 'Ollama is already running'
} catch {
    Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WorkingDirectory (Split-Path -Parent $ollamaExe) -WindowStyle Hidden | Out-Null
    $ready = $false
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        Start-Sleep -Seconds 1
        try {
            $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2
            $ready = $true
            break
        } catch { }
    }
    if (-not $ready) { throw 'Ollama did not respond at localhost:11434' }
}

$installed = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
if ($installed.models.name -notcontains $Model) {
    Write-Host "Downloading model $Model to drive D ..."
    & $ollamaExe pull $Model
    if ($LASTEXITCODE -ne 0) { throw "Could not download model $Model" }
}

Write-Host "Warming model $Model (first load can take a few minutes) ..."
$warmupBody = @{
    model = $Model
    messages = @(@{ role = 'user'; content = 'Reply OK' })
    think = $false
    stream = $false
    keep_alive = '10m'
    options = @{ num_predict = 8 }
} | ConvertTo-Json -Depth 5
$warmupBytes = [System.Text.Encoding]::UTF8.GetBytes($warmupBody)
$null = Invoke-RestMethod 'http://127.0.0.1:11434/api/chat' -Method Post -ContentType 'application/json; charset=utf-8' -Body $warmupBytes -TimeoutSec 300

Write-Host "Model $Model is ready at http://127.0.0.1:11434"
