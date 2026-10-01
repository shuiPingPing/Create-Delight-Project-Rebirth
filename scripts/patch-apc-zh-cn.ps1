<#
  patch-apc-zh-cn.ps1

  What it does
    Localizes the UI text of "Aeronautics Preflight Checklist" (a client-only Create: Aeronautics
    addon). That mod ships NO language file: every string is hardcoded in its class constant pools,
    so neither a resource pack nor a kubejs/assets/<modid>/lang/zh_cn.json override can translate it.
    This script rewrites only CONSTANT_Utf8 text inside three classes. No bytecode instruction is
    touched, so the class layout stays valid.

    Translations live in scripts/apc-zh-cn.json (UTF-8), next to this script. That file also carries
    U+0001, the mod's own numeric placeholder, which is preserved 1:1.

  Usage
    pwsh -File scripts\patch-apc-zh-cn.ps1                  # patch (backs up the pristine jar first)
    pwsh -File scripts\patch-apc-zh-cn.ps1 -Check           # report only, changes nothing
    pwsh -File scripts\patch-apc-zh-cn.ps1 -Restore         # restore the pristine jar
    pwsh -File scripts\patch-apc-zh-cn.ps1 -JarPath <path>  # operate on another jar (self-test)

  Notes
    - Idempotent: exits 0 when the Chinese text is already in place.
    - Keeps the pristine jar at mods\.apc-original\ (NeoForge does not scan subfolders of mods/).
    - Aborts without touching any file when an expected English source string is missing, which is
      what happens after a mod update until the table in apc-zh-cn.json is refreshed.
    - Minecraft must be closed; the jar stays locked while the game runs.
    - devtool.bat install-files / download-files / check-hashes compare the jar against the descriptor
      hash, so they restore the unpatched download; re-run this script afterwards (same caveat as
      scripts/patch-northstar-sun.ps1).
    - This script is deliberately ASCII-only so that both Windows PowerShell 5.1 and PowerShell 7
      read it correctly; all non-ASCII text lives in the JSON file.
#>
param(
    [string]$PackRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$JarPath = '',
    [switch]$Restore,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$tableFile = Join-Path $PSScriptRoot 'apc-zh-cn.json'
if (-not (Test-Path $tableFile)) { Write-Host "[patch-apc-zh-cn] ERROR: missing $tableFile"; exit 1 }
$table = (Get-Content -LiteralPath $tableFile -Raw -Encoding UTF8 | ConvertFrom-Json).classes

function Get-ConstantPool {
    param([byte[]]$Data)
    if ($Data.Length -lt 10 -or $Data[0] -ne 0xCA -or $Data[1] -ne 0xFE -or $Data[2] -ne 0xBA -or $Data[3] -ne 0xBE) {
        throw 'not a class file (bad magic)'
    }
    $count = (([int]$Data[8]) -shl 8) -bor [int]$Data[9]
    $entries = New-Object System.Collections.ArrayList
    $pos = 10
    $i = 1
    while ($i -lt $count) {
        $tag = $Data[$pos]
        $pos++
        if ($tag -eq 1) {
            $len = (([int]$Data[$pos]) -shl 8) -bor [int]$Data[$pos + 1]
            [void]$entries.Add([pscustomobject]@{ Index = $i; Tag = 1; PayloadStart = $pos; PayloadLength = 2 + $len })
            $pos += 2 + $len
        } elseif ($tag -eq 3 -or $tag -eq 4) {
            [void]$entries.Add([pscustomobject]@{ Index = $i; Tag = $tag; PayloadStart = $pos; PayloadLength = 4 }); $pos += 4
        } elseif ($tag -eq 5 -or $tag -eq 6) {
            [void]$entries.Add([pscustomobject]@{ Index = $i; Tag = $tag; PayloadStart = $pos; PayloadLength = 8 }); $pos += 8; $i++
        } elseif ($tag -in 7, 8, 16, 19, 20) {
            [void]$entries.Add([pscustomobject]@{ Index = $i; Tag = $tag; PayloadStart = $pos; PayloadLength = 2 }); $pos += 2
        } elseif ($tag -in 9, 10, 11, 12, 17, 18) {
            [void]$entries.Add([pscustomobject]@{ Index = $i; Tag = $tag; PayloadStart = $pos; PayloadLength = 4 }); $pos += 4
        } elseif ($tag -eq 15) {
            [void]$entries.Add([pscustomobject]@{ Index = $i; Tag = $tag; PayloadStart = $pos; PayloadLength = 3 }); $pos += 3
        } else {
            throw ("unknown constant pool tag {0} at index {1}" -f $tag, $i)
        }
        $i++
    }
    return [pscustomobject]@{ Entries = $entries; Count = $count; End = $pos }
}

function Get-ClassBytes {
    param($Zip, [string]$EntryName)
    $entry = $Zip.Entries | Where-Object { $_.FullName -eq $EntryName }
    if (-not $entry) { throw ("entry not found in jar: $EntryName") }
    $ms = New-Object IO.MemoryStream
    $s = $entry.Open(); $s.CopyTo($ms); $s.Close()
    $bytes = $ms.ToArray(); $ms.Dispose()
    return $bytes
}

function Get-StringTable {
    param([byte[]]$Data)
    $cp = Get-ConstantPool -Data $Data
    $map = @{}
    foreach ($e in $cp.Entries) {
        if ($e.Tag -ne 1) { continue }
        $len = (([int]$Data[$e.PayloadStart]) -shl 8) -bor [int]$Data[$e.PayloadStart + 1]
        $map[[Text.Encoding]::UTF8.GetString($Data, $e.PayloadStart + 2, $len)] = $e
    }
    return $map
}

function Set-Utf8String {
    param([byte[]]$Data, $Entry, [string]$NewText)
    $bytes = [Text.Encoding]::UTF8.GetBytes($NewText)
    $segStart = $Entry.PayloadStart
    $segLength = $Entry.PayloadLength
    $tailLen = $Data.Length - $segStart - $segLength
    $out = New-Object byte[] ($Data.Length - $segLength + 2 + $bytes.Length)
    [Array]::Copy($Data, 0, $out, 0, $segStart)
    $out[$segStart] = [byte](($bytes.Length -shr 8) -band 0xFF)
    $out[$segStart + 1] = [byte]($bytes.Length -band 0xFF)
    [Array]::Copy($bytes, 0, $out, $segStart + 2, $bytes.Length)
    if ($tailLen -gt 0) { [Array]::Copy($Data, $segStart + $segLength, $out, $segStart + 2 + $bytes.Length, $tailLen) }
    return $out
}

$classNames = @($table.PSObject.Properties | ForEach-Object { $_.Name })

# --- locate the jar ---
if ($JarPath) {
    $jar = Get-Item -LiteralPath $JarPath
} else {
    $cand = @(Get-ChildItem (Join-Path $PackRoot 'mods') -Filter 'aeronautics_preflight_checklist-*.jar' -File -ErrorAction SilentlyContinue)
    if ($cand.Count -eq 0) { Write-Host '[patch-apc-zh-cn] ERROR: no aeronautics_preflight_checklist-*.jar under mods/'; exit 1 }
    if ($cand.Count -gt 1) { Write-Host ('[patch-apc-zh-cn] ERROR: multiple jars matched: ' + (($cand | ForEach-Object Name) -join ', ')); exit 1 }
    $jar = $cand[0]
}
$backupDir = Join-Path (Split-Path $jar.FullName -Parent) '.apc-original'
$backup = Join-Path $backupDir $jar.Name

if ($Restore) {
    if (-not (Test-Path $backup)) { Write-Host "[patch-apc-zh-cn] ERROR: no backup at $backup"; exit 1 }
    try { Copy-Item $backup $jar.FullName -Force } catch { Write-Host ('[patch-apc-zh-cn] ERROR: restore failed (is the game running?): ' + $_.Exception.Message); exit 1 }
    Write-Host "[patch-apc-zh-cn] restored original: $($jar.Name)"
    exit 0
}

try { $probe = [IO.File]::Open($jar.FullName, 'Open', 'ReadWrite', 'None'); $probe.Close() }
catch { Write-Host ('[patch-apc-zh-cn] ERROR: jar is locked, close the game first. ' + $_.Exception.Message); exit 1 }

# --- current state ---
$enLeft = 0; $zhDone = 0; $total = 0; $missing = New-Object System.Collections.ArrayList
$zip = [IO.Compression.ZipFile]::OpenRead($jar.FullName)
try {
    foreach ($cls in $classNames) {
        $bytes = Get-ClassBytes -Zip $zip -EntryName $cls
        $map = Get-StringTable -Data $bytes
        foreach ($p in $table.$cls) {
            $total++
            $hasEn = $map.ContainsKey($p.from)
            $hasZh = $map.ContainsKey($p.to)
            if ($hasZh -and -not $hasEn) { $zhDone++ }
            elseif (-not $hasEn) { [void]$missing.Add("$cls :: $($p.from)") }
            else { $enLeft++ }
        }
    }
} finally { $zip.Dispose() }

Write-Host ("[patch-apc-zh-cn] entries {0}: english present {1}, chinese in place {2}, source missing {3}" -f $total, $enLeft, $zhDone, $missing.Count)
if ($zhDone -eq $total) { Write-Host '[patch-apc-zh-cn] already patched - nothing to do.'; exit 0 }
if ($missing.Count -gt 0) {
    Write-Host '[patch-apc-zh-cn] ERROR: these source strings were not found (mod updated?), no file was modified:'
    $missing | ForEach-Object { Write-Host ('    - ' + $_) }
    exit 1
}
if ($Check) { Write-Host '[patch-apc-zh-cn] -Check: patch needed (nothing modified)'; exit 0 }

# --- backup then rebuild the jar ---
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
if (-not (Test-Path $backup)) {
    Copy-Item $jar.FullName $backup -Force
    Write-Host "[patch-apc-zh-cn] pristine copy saved: mods\.apc-original\$($jar.Name)"
}

$tmp = "$($jar.FullName).patched"
if (Test-Path $tmp) { Remove-Item $tmp -Force }
$zin = [IO.Compression.ZipFile]::OpenRead($jar.FullName)
$zout = [IO.Compression.ZipFile]::Open($tmp, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($entry in $zin.Entries) {
        $newEntry = $zout.CreateEntry($entry.FullName)
        if ($classNames -contains $entry.FullName) {
            $ms = New-Object IO.MemoryStream
            $s = $entry.Open(); $s.CopyTo($ms); $s.Close()
            $data = $ms.ToArray(); $ms.Dispose()
            foreach ($p in $table.($entry.FullName)) {
                $map = Get-StringTable -Data $data
                if (-not $map.ContainsKey($p.from)) { throw ("{0}: source string not found: {1}" -f $entry.FullName, $p.from) }
                $data = Set-Utf8String -Data $data -Entry $map[$p.from] -NewText $p.to
            }
            $os = $newEntry.Open(); $os.Write($data, 0, $data.Length); $os.Close()
        } else {
            $is = $entry.Open(); $os = $newEntry.Open(); $is.CopyTo($os); $os.Close(); $is.Close()
        }
    }
} finally { $zout.Dispose(); $zin.Dispose() }

# --- verify before replacing ---
try {
    $checkZip = [IO.Compression.ZipFile]::OpenRead($tmp)
    try {
        foreach ($cls in $classNames) {
            $bytes = Get-ClassBytes -Zip $checkZip -EntryName $cls
            $map = Get-StringTable -Data $bytes
            foreach ($p in $table.$cls) {
                if (-not $map.ContainsKey($p.to)) { throw ("verify failed: {0} lacks {1}" -f $cls, $p.to) }
                if ($map.ContainsKey($p.from)) { throw ("verify failed: {0} still has {1}" -f $cls, $p.from) }
            }
        }
    } finally { $checkZip.Dispose() }
} catch {
    Write-Host ('[patch-apc-zh-cn] ERROR: verification failed, original kept: ' + $_.Exception.Message)
    Remove-Item $tmp -Force
    exit 1
}

$sizeBefore = $jar.Length
Remove-Item $jar.FullName -Force
Move-Item $tmp $jar.FullName
Write-Host ("[patch-apc-zh-cn] OK: $($jar.Name) localized ({0} -> {1} bytes)" -f $sizeBefore, (Get-Item $jar.FullName).Length)
Write-Host '[patch-apc-zh-cn] local patch: re-run after a mod update (the script self-checks first).'
exit 0
