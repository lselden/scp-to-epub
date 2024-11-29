<#
.SYNOPSIS
    Package project using @yao-pkg/pkg
#>

[CmdletBinding()]
param (
    [Parameter()] [switch] $CopyPuppeteerArtifacts,
    [Parameter()] [string] $PuppeteerExecutableDir,
    # the executablePath that will be set in default.yaml for puppeteer
    [Parameter()] [string] $BundledExecutablePath = 'bin/chrome.exe',
    [Parameter()] [string] $BinaryName = 'scp-to-epub.exe',
    # change this if you want to try building for other platforms -- see @yao-pkg/pkg docs
    [Parameter()] [string] $PkgTarget = 'node20-win',
    [Parameter()] [switch] $NoCleanup
)

# go to main dir
push-location (Split-Path $PSScriptRoot -Parent)

$releaseFolder = '.\build\release';
# must match tsup.config.ts
$stagingFolder = '.\build\staging';

# cleanup previous build
if ($NoCleanup -ne $true) {
    @($releaseFolder, $stagingFolder) | Remove-Item -Recurse -Force -ErrorAction Ignore
}

@($releaseFolder, $stagingFolder) | % { mkdir $_ -Force } | Out-Null

write-host "building to staging dir"

# compile into single file and bundle dependencies using tsup
npm run build;

# copy static assets (to be added to virtual filesystem)
@('assets', 'static') | % { Copy-Item -Recurse $_ -Destination $stagingFolder -Force }


# copy cached version of chrome installed by puppeteer
if (-not $PuppeteerExecutableDir) {
    $PuppeteerExecutableDir = dir ~\.cache\puppeteer\chrome\*\*\ | select -first 1 -expand FullName
}
if ($CopyPuppeteerArtifacts) {
    Write-Host "adding bundled chrome"
    $bundledDir = (Join-Path $releaseFolder (Split-Path $BundledExecutablePath -Parent));
    Remove-Item $bundledDir -Recurse -ErrorAction Ignore
    Copy-Item -Path "$PuppeteerExecutableDir" -Recurse -Destination $bundledDir -Force
}

write-host "copying assets to release folder"
# write out default.yaml so that puppeteer will load bundled version
@"
### DO NOT MODIFY!!!
### Don't change these values! Instead override them in config.yaml
browser:
  executablePath: '$BundledExecutablePath'
"@ | Set-Content (Join-Path $releaseFolder 'default.yaml');

# copy assets to be distributed
@('config.yaml', 'README.md', 'books') | % { Copy-Item -Recurse $_ $releaseFolder }

write-host "installing WASM image compression library"
### rewrite package.json to remove bundled dependencies
$pkg = get-content .\package.json -Encoding utf8 | ConvertFrom-Json

$pkg.bin = 'index.js';
$pkg.devDependencies = @{};
# sharp included b/c using wasm build
$pkg.dependencies = @{
    sharp = $pkg.dependencies.sharp;
};

$stagingPackagePath = join-path $stagingFolder 'package.json';

# write to staging
$pkg | ConvertTo-Json -Depth 10 | Set-Content $stagingPackagePath

# install sharp as WASM
Push-Location $stagingFolder

npm install --cpu=wasm32

pop-location

Write-Host "build to binary using pkg"

# build using pkg
$outputExecutable = Join-Path $releaseFolder $BinaryName
npx @yao-pkg/pkg $stagingPackagePath --output $outputExecutable --target $PkgTarget

$releaseVersion = $pkg.version
$packageName = $pkg.name

Write-Host "zipping"

$zipPath = Join-Path (Split-Path $releaseFolder -Parent) "$packageName.$releaseVersion.zip"
Compress-Archive -Path $releaseFolder -DestinationPath $zipPath -Force

Pop-Location

write-host "done!"