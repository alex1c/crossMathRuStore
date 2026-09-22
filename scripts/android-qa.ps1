# CrossMath / Matematicheskiy krossvord - Android QA pre-flight (ForestMusic)
#
# Safe checks only. Does NOT kill processes, clean gradle, delete caches,
# run expo prebuild --clean, launch Pixel_10, or modify tracked source.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$MetroPort = 8081
$PreferredAvd = 'ForestMusic_Fast_API35'
$HeavyAvdHint = 'Pixel_10'

function Write-Section([string]$Title) {
	Write-Host ""
	Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Test-TcpPort([int]$Port) {
	try {
		$listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
		$endpoints = $listener.GetActiveTcpListeners()
		return [bool]($endpoints | Where-Object { $_.Port -eq $Port })
	} catch {
		try {
			$client = New-Object System.Net.Sockets.TcpClient
			$iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
			$ok = $iar.AsyncWaitHandle.WaitOne(200)
			if ($ok -and $client.Connected) {
				$client.Close()
				return $true
			}
			$client.Close()
			return $false
		} catch {
			return $false
		}
	}
}

$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root 'package.json'))) {
	$root = $PSScriptRoot
}

Write-Host "CrossMath android-qa.ps1 (safe pre-flight)" -ForegroundColor Green
Write-Host "Project root: $root"

# --- git status ---
Write-Section 'git status'
Push-Location $root
try {
	if (Test-Path (Join-Path $root '.git')) {
		git status --short --branch
	} else {
		Write-Host "WARN: not a git repository" -ForegroundColor Yellow
	}
} finally {
	Pop-Location
}

# --- Android SDK ---
Write-Section 'Android SDK'
$sdkCandidates = @(
	$env:ANDROID_HOME,
	$env:ANDROID_SDK_ROOT,
	(Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
	(Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk')
) | Where-Object { $_ -and $_.Trim() -ne '' } | Select-Object -Unique

$sdkRoot = $null
foreach ($candidate in $sdkCandidates) {
	if (Test-Path $candidate) {
		$sdkRoot = $candidate
		break
	}
}

if ($sdkRoot) {
	Write-Host "OK: Android SDK found at $sdkRoot" -ForegroundColor Green
} else {
	Write-Host "WARN: Android SDK not found (ANDROID_HOME / ANDROID_SDK_ROOT / default path)" -ForegroundColor Yellow
}

# --- android/ + local.properties ---
Write-Section 'android project'
$androidDir = Join-Path $root 'android'
$localProps = Join-Path $androidDir 'local.properties'

if (-not (Test-Path $androidDir)) {
	Write-Host "INFO: android/ directory does not exist yet (Expo managed / prebuild not run)." -ForegroundColor Yellow
	Write-Host "      This is expected during Phase 0 scaffold. Native compile QA comes after prebuild." -ForegroundColor Yellow
} else {
	Write-Host "OK: android/ directory present" -ForegroundColor Green
	if (Test-Path $localProps) {
		Write-Host "OK: android/local.properties exists" -ForegroundColor Green
	} else {
		Write-Host "WARN: android/local.properties missing - SDK path may not resolve for Gradle" -ForegroundColor Yellow
	}
}

# --- adb ---
Write-Section 'adb'
$adb = $null
if ($sdkRoot) {
	$adbCandidate = Join-Path $sdkRoot 'platform-tools\adb.exe'
	if (Test-Path $adbCandidate) {
		$adb = $adbCandidate
	}
}
if (-not $adb) {
	$fromPath = Get-Command adb -ErrorAction SilentlyContinue
	if ($fromPath) {
		$adb = $fromPath.Source
	}
}

if ($adb) {
	Write-Host "OK: adb at $adb" -ForegroundColor Green
} else {
	Write-Host "WARN: adb not available" -ForegroundColor Yellow
}

# --- devices ---
Write-Section 'adb devices'
$hasRealDevice = $false
$hasEmulator = $false
if ($adb) {
	& $adb devices
	$deviceLines = & $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\S' }
	foreach ($line in $deviceLines) {
		if ($line -match '^(\S+)\s+device') {
			$id = $Matches[1]
			if ($id -like 'emulator-*') {
				$hasEmulator = $true
			} else {
				$hasRealDevice = $true
			}
		}
	}
	if ($hasRealDevice) {
		Write-Host "OK: real device preferred for QA" -ForegroundColor Green
	} elseif ($hasEmulator) {
		Write-Host "INFO: emulator connected - prefer real device when possible" -ForegroundColor Yellow
		Write-Host "INFO: preferred AVD later: $PreferredAvd (avoid $HeavyAvdHint unless necessary)" -ForegroundColor Yellow
	} else {
		Write-Host "INFO: no device online" -ForegroundColor Yellow
	}
} else {
	Write-Host "SKIP: cannot list devices without adb" -ForegroundColor Yellow
}

# --- Metro ports ---
Write-Section 'Metro ports (8081 / 8082 / 8083)'
$port8081 = Test-TcpPort 8081
$port8082 = Test-TcpPort 8082
$port8083 = Test-TcpPort 8083

Write-Host ("8081 (project Metro): {0}" -f ($(if ($port8081) { 'IN USE' } else { 'free' })))
Write-Host ("8082: {0}" -f ($(if ($port8082) { 'IN USE' } else { 'free' })))
Write-Host ("8083: {0}" -f ($(if ($port8083) { 'IN USE' } else { 'free' })))

if ($port8081) {
	Write-Host "WARN: Metro may already be running on $MetroPort - one Metro per project; do not hop to 8082/8083" -ForegroundColor Yellow
}
if ($port8082 -or $port8083) {
	Write-Host "WARN: conflicting Metro-like ports detected (8082/8083). Stay on 8081 for this project." -ForegroundColor Yellow
}

# --- adb reverse for real device ---
Write-Section 'adb reverse'
if ($adb -and $hasRealDevice) {
	Write-Host "Applying: adb reverse tcp:$MetroPort tcp:$MetroPort"
	& $adb reverse "tcp:$MetroPort" "tcp:$MetroPort"
	if ($LASTEXITCODE -eq 0) {
		Write-Host "OK: adb reverse set for real device" -ForegroundColor Green
	} else {
		Write-Host "WARN: adb reverse failed (exit $LASTEXITCODE)" -ForegroundColor Yellow
	}
} elseif ($adb -and $hasEmulator) {
	Write-Host "SKIP: emulator does not need adb reverse for Metro" -ForegroundColor Yellow
} else {
	Write-Host "SKIP: no real device for adb reverse" -ForegroundColor Yellow
}

Write-Section 'summary'
Write-Host "Pre-flight finished. No destructive cleanup was performed."
Write-Host "Next (manual): npm start on port $MetroPort; prefer real device; AVD $PreferredAvd if needed."
Write-Host "Do NOT auto-launch $HeavyAvdHint from this script."
exit 0
