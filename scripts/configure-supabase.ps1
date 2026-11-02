$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $root '.env'
$projectRef = 'orcbxehxymmvtvwzdaeb'
$poolerHost = 'aws-0-eu-west-1.pooler.supabase.com'

if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Missing .env file at $envPath. Copy .env.example to .env first."
}

$securePassword = Read-Host 'Enter the Supabase database password (input stays hidden)' -AsSecureString
$passwordPtr = [IntPtr]::Zero
try {
  $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
  $encodedPassword = [uri]::EscapeDataString($password)

  $transactionUrl = "postgresql://postgres.$projectRef`:$encodedPassword@$poolerHost`:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
  $sessionUrl = "postgresql://postgres.$projectRef`:$encodedPassword@$poolerHost`:5432/postgres?sslmode=require"
  $sessionStoreUrl = $sessionUrl

  $values = [ordered]@{
    DATABASE_URL = $transactionUrl
    DIRECT_URL = $sessionUrl
    SESSION_DATABASE_URL = $sessionStoreUrl
  }

  $lines = [System.Collections.Generic.List[string]]::new()
  foreach ($line in [System.IO.File]::ReadAllLines($envPath)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=') {
      $key = $Matches[1]
      if ($values.Contains($key)) {
        $lines.Add("$key=$($values[$key])")
        $values.Remove($key)
        continue
      }
    }
    $lines.Add($line)
  }

  foreach ($key in @($values.Keys)) {
    $lines.Add("$key=$($values[$key])")
  }

  [System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'Supabase URLs saved to .env. Password values were not printed.' -ForegroundColor Green
}
finally {
  if ($passwordPtr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
  }
  if ($null -ne $password) { $password = $null }
  if ($null -ne $encodedPassword) { $encodedPassword = $null }
  $securePassword.Dispose()
}
