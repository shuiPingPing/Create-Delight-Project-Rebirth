<#
  patch-northstar-sun.ps1

  What it does
    Removes Northstar's "client.LevelRendererMixin" entry from northstar.mixins.json inside the
    Northstar jar. That mixin wraps LevelRenderer.renderSky (SUN_LOCATION / MOON_LOCATION), which
    defeats Iris' MixinLevelRenderer_SunMoonToggle: shader packs that declare "sun=false" then still
    get the vanilla sun drawn -> two suns (shader sun + vanilla sun). Removing the entry fixes it.

  Where it is needed
    Create Delight Project Rebirth (1.21.1 fork) instances with Iris + a shaderpack + Northstar.

  Usage
    pwsh -File scripts\patch-northstar-sun.ps1
    pwsh -File scripts\patch-northstar-sun.ps1 -PackRoot D:\path\to\CDR1211

  Notes
    - Idempotent: exits 0 when the mixin entry is already gone.
    - Keeps a pristine jar at mods\.northstar-original\ (NeoForge does not scan subfolders of mods/).
    - "devtool install-files" / "check" restore the descriptor jar, so re-run this script afterwards.
    - Verified against Northstar-0.6.1+1.21.1.jar (4869 entries).
#>
param([string]$PackRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$mods = Join-Path $PackRoot 'mods'
$jar = Get-ChildItem $mods -Filter 'Northstar-*.jar' -File -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jar) { Write-Host "[patch-northstar-sun] ERROR: Northstar jar not found in $mods"; exit 1 }

$MIXIN_ENTRY = '"client.LevelRendererMixin"'
$MIXIN_JSON  = 'northstar.mixins.json'

# --- read the mixin config -------------------------------------------------
$json = $null
$entryCount = 0
$zip = [System.IO.Compression.ZipFile]::OpenRead($jar.FullName)
try {
    $entryCount = $zip.Entries.Count
    $e = $zip.Entries | Where-Object { $_.FullName -eq $MIXIN_JSON }
    if (-not $e) { Write-Host "[patch-northstar-sun] ERROR: $MIXIN_JSON not found inside $($jar.Name)"; exit 1 }
    $sr = New-Object System.IO.StreamReader($e.Open())
    $json = $sr.ReadToEnd()
    $sr.Close()
} finally { $zip.Dispose() }

if ($json -notmatch [regex]::Escape($MIXIN_ENTRY)) {
    Write-Host "[patch-northstar-sun] already patched ($MIXIN_ENTRY absent) - nothing to do."
    exit 0
}

# --- pristine copy --------------------------------------------------------
$backupDir = Join-Path $mods '.northstar-original'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backup = Join-Path $backupDir $jar.Name
if (-not (Test-Path $backup)) {
    Copy-Item $jar.FullName $backup -Force
    Write-Host "[patch-northstar-sun] pristine copy saved: mods\.northstar-original\$($jar.Name)"
}

# --- rebuild the jar without that one entry -------------------------------
$patched = (($json -split "`r?`n") | Where-Object { $_ -notmatch [regex]::Escape($MIXIN_ENTRY) }) -join "`r`n"
$tmp = "$($jar.FullName).patched"
if (Test-Path $tmp) { Remove-Item $tmp -Force }

$zin  = [System.IO.Compression.ZipFile]::OpenRead($jar.FullName)
$zout = [System.IO.Compression.ZipFile]::Open($tmp, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($entry in $zin.Entries) {
        $ne = $zout.CreateEntry($entry.FullName)
        if ($entry.FullName -eq $MIXIN_JSON) {
            $sw = New-Object System.IO.StreamWriter($ne.Open(), (New-Object System.Text.UTF8Encoding($false)))
            $sw.Write($patched)
            $sw.Close()
        } else {
            $is = $entry.Open(); $os = $ne.Open()
            $is.CopyTo($os); $os.Close(); $is.Close()
        }
    }
} finally { $zout.Dispose(); $zin.Dispose() }

Remove-Item $jar.FullName -Force
Move-Item $tmp $jar.FullName

# --- verify ---------------------------------------------------------------
$check = [System.IO.Compression.ZipFile]::OpenRead($jar.FullName)
try {
    $newCount = $check.Entries.Count
    $je = $check.Entries | Where-Object { $_.FullName -eq $MIXIN_JSON }
    $jr = New-Object System.IO.StreamReader($je.Open()); $after = $jr.ReadToEnd(); $jr.Close()
} finally { $check.Dispose() }

if ($after -match [regex]::Escape($MIXIN_ENTRY)) {
    Write-Host "[patch-northstar-sun] ERROR: patch did not apply - restoring pristine copy"
    Copy-Item $backup $jar.FullName -Force
    exit 1
}
if ($newCount -ne $entryCount) {
    Write-Host "[patch-northstar-sun] WARNING: entry count changed ($entryCount -> $newCount)"
}

Write-Host "[patch-northstar-sun] OK: $($jar.Name) patched (entries: $newCount, mixin removed: client.LevelRendererMixin)"
Write-Host "[patch-northstar-sun] side effect: Northstar's own space dimensions lose its sun/moon/sky overrides."
exit 0
