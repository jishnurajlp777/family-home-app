$ErrorActionPreference = "Stop"

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$latestDir = "$sdkPath\cmdline-tools\latest"
$sdkManager = "$latestDir\bin\sdkmanager.bat"
$licensesDir = "$sdkPath\licenses"

Write-Host "Creating Android SDK licenses..."
if (-not (Test-Path $licensesDir)) {
    New-Item -ItemType Directory -Path $licensesDir -Force | Out-Null
}

# Standard Android SDK license hashes
$androidSdkLicense = @"
24333f8a6356ddf448e9d70479e37288f8ec282c
89339edd26307782d00f696b79ecf4a7423a7b5c
d56f5187479451eabf01fb78af6dfcb131a6481e
"@

$androidSdkPreviewLicense = @"
84831b9409646a918e30573bab4c9c91346d8abd
"@

$androidGoogletvLicense = @"
601085b94cd77f0b54ff864069570991500085d7
"@

Set-Content -Path "$licensesDir\android-sdk-license" -Value $androidSdkLicense -Force
Set-Content -Path "$licensesDir\android-sdk-preview-license" -Value $androidSdkPreviewLicense -Force
Set-Content -Path "$licensesDir\android-googletv-license" -Value $androidGoogletvLicense -Force

Write-Host "Licenses pre-configured in $licensesDir"

# Update local.properties with forward slashes
$localProps = "$PSScriptRoot\android\local.properties"
"sdk.dir=C:/Users/jishn/AppData/Local/Android/Sdk" | Set-Content -Path $localProps -Force
Write-Host "Updated $localProps"

# Accept any remaining licenses non-interactively
Write-Host "Verifying licenses..."
$yesStream = ("y`r`n" * 50)
$yesStream | & "$sdkManager" "--sdk_root=$sdkPath" --licenses

Write-Host "Installing platform-tools, platforms;android-34, build-tools;34.0.0..."
& "$sdkManager" "--sdk_root=$sdkPath" "platform-tools" "platforms;android-34" "build-tools;34.0.0"

Write-Host "Android SDK components installed successfully!"
