param(
    [string]$EnvFile = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ComposeFile = Join-Path $ScriptDir "docker-compose.yml"
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
    $EnvFile = Join-Path $ScriptDir ".env"
}

if (-not (Test-Path -Path $EnvFile)) {
    Write-Error "Missing env file: $EnvFile"
    Write-Host "Create it from: $(Join-Path $ScriptDir '.env.example')"
    exit 1
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    docker compose --env-file $EnvFile -f $ComposeFile @Args
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose command failed: $($Args -join ' ')"
    }
}

Write-Host "Stopping stack and deleting project volumes..."
Invoke-Compose down -v --remove-orphans

Write-Host "Running clean deployment..."
& (Join-Path $ScriptDir "deploy.ps1") -EnvFile $EnvFile
