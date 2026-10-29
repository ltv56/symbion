# Load infra/.env into the current PowerShell session. Dot-source it: . infra/env.ps1
Get-Content "$PSScriptRoot/.env" | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    Set-Item "env:$($matches[1].Trim())" $matches[2].Trim()
  }
}
$env:DB_HOST = '127.0.0.1'
