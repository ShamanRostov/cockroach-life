# Deploy AI-generated PNG assets from Cursor assets cache into public/assets/
$src = "C:\Users\Владимир\.cursor\projects\c-UnityProject-ockroach-life\assets"
$root = Join-Path $PSScriptRoot "..\public\assets"

function Ensure-Dir($p) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
function Copy-Asset($from, $to) {
  if (Test-Path $from) {
    Ensure-Dir (Split-Path $to)
    Copy-Item $from $to -Force
    return $true
  }
  return $false
}

$ui = Join-Path $root "ui"
$bg = Join-Path $root "backgrounds"
$spr = Join-Path $root "sprites"
$bld = Join-Path $root "buildings"
$chr = Join-Path $root "characters"

Ensure-Dir $ui; Ensure-Dir $bg; Ensure-Dir $spr; Ensure-Dir $bld; Ensure-Dir $chr

# UI
Copy-Asset "$src\ui-panel.png" "$ui\ui-panel.png"
Copy-Asset "$src\ui-button.png" "$ui\ui-button.png"
Copy-Asset "$src\ui-button-hover.png" "$ui\ui-button-hover.png"
if (-not (Test-Path "$ui\ui-button-hover.png")) { Copy-Asset "$src\ui-button.png" "$ui\ui-button-hover.png" }
Copy-Asset "$src\ui-hud-panel.png" "$ui\ui-hud-panel.png"

# Backgrounds
foreach ($pair in @(
  @("menu-bg.png","menu-bg.png"), @("nest-bg.png","nest-bg.png"),
  @("floor-tile.png","floor-tile.png"), @("world-map-bg.png","world-map-bg.png"),
  @("raid-infiltrate-bg.png","raid-infiltrate-bg.png"),
  @("arcade-slipper-bg.png","arcade-slipper-bg.png"), @("arcade-spray-bg.png","arcade-spray-bg.png"),
  @("arcade-food-bg.png","arcade-food-bg.png"), @("arcade-hospital-bg.png","arcade-hospital-bg.png"),
  @("arcade-catch-bg.png","arcade-catch-bg.png")
)) { Copy-Asset "$src\$($pair[0])" "$bg\$($pair[1])" }

# Vignette — reuse menu-bg darkened name or spark
Copy-Asset "$src\menu-bg.png" "$bg\vignette.png"

# Sprites
Copy-Asset "$src\sprite-slipper.png" "$spr\slipper.png"
if (-not (Test-Path "$spr\slipper.png")) { Copy-Asset "$src\slipper.png" "$spr\slipper.png" }
Copy-Asset "$src\sprite-food-crumb.png" "$spr\food-crumb.png"
if (-not (Test-Path "$spr\food-crumb.png")) { Copy-Asset "$src\food-crumb.png" "$spr\food-crumb.png" }
Copy-Asset "$src\sprite-spray-cloud.png" "$spr\spray-cloud.png"
Copy-Asset "$src\sprite-crack.png" "$spr\crack.png"
Copy-Asset "$src\sprite-glue-trap.png" "$spr\glue-trap.png"
Copy-Asset "$src\sprite-heart-pulse.png" "$spr\heart-pulse.png"
Copy-Asset "$src\sprite-spark.png" "$spr\spark.png"
if (-not (Test-Path "$spr\spark.png")) { Copy-Asset "$src\spark.png" "$spr\spark.png" }
Copy-Asset "$src\sprite-nest-marker.png" "$spr\nest-marker.png"
Copy-Asset "$src\cat.png" "$spr\cat.png"

# Buildings
foreach ($type in @("kitchen","bedroom","storage","nursery","hospital","planter","shelter","locker","niche")) {
  $from = "$src\building-$type.png"
  if (-not (Test-Path $from)) { $from = "$src\building-kitchen.png" }
  Copy-Asset $from "$bld\building-$type.png"
}

# Cockroach frames
$roach = "$src\cockroach-0.png"
if (-not (Test-Path $roach)) { $roach = "$src\cockroach.png" }
if (-not (Test-Path $roach)) { $roach = "$src\cockroach-walk.png" }
0..7 | ForEach-Object { Copy-Asset $roach "$chr\cockroach-$_.png" }

Write-Host "Assets deployed to $root"
Get-ChildItem $root -Recurse -Filter "*.png" | Measure-Object | ForEach-Object { Write-Host "PNG count:" $_.Count }
