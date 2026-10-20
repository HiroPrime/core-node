param(
  [string]$Manifest = (Join-Path $PSScriptRoot 'charlie-arcade.json'),
  [ValidateSet('preflight', 'lock', 'template', 'walk', 'process', 'qa', 'publish', 'all')]
  [string]$Stage = 'all',
  [int]$FrameLimit = 0,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Resolve-CorePath([string]$Value) {
  if ([System.IO.Path]::IsPathRooted($Value)) {
    return [System.IO.Path]::GetFullPath($Value)
  }
  return [System.IO.Path]::GetFullPath((Join-Path $script:Core $Value))
}

function Require-File([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing $Label`: $Path"
  }
}

function Require-Directory([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    throw "Missing $Label`: $Path"
  }
}

function Invoke-Native([string]$Label, [scriptblock]$Command) {
  Write-Output ""
  Write-Output "=== $Label"
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

function Count-Frames([string]$Directory, [string]$Pattern) {
  if (-not (Test-Path $Directory)) {
    return 0
  }
  return @(Get-ChildItem -LiteralPath $Directory -Filter $Pattern -File).Count
}

function Assert-FrameCount([string]$Directory, [string]$Pattern, [int]$Expected, [string]$Label) {
  $count = Count-Frames $Directory $Pattern
  if ($count -ne $Expected) {
    throw "$Label expected $Expected frames but found $count in $Directory"
  }
}

function Reset-StageDirectory([string]$Directory) {
  if ($Force -and (Test-Path $Directory)) {
    Remove-Item -LiteralPath $Directory -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $Directory | Out-Null
}

function Test-Preflight {
  Write-Output '=== Sprite pipeline preflight'
  Require-File $script:SourceAPose 'source A-pose'
  Require-File $script:Benchmark 'Gemini benchmark'
  Require-Directory $script:PackCharacter 'GegX character pack'
  Require-File $script:PackReadme 'GegX license readme'
  Require-File $script:PackTemplate 'pack template script'
  Require-File $script:Reskin 'reskin script'
  Require-File $script:FrameCut 'frame cut script'
  Require-File $script:Mirror 'mirror script'
  Require-File $script:MakeViews 'automatic directional-view script'
  Require-File $script:PixelReferenceScript 'pixel identity reference script'
  Require-File $script:RigWalk 'deterministic chibi rig script'
  Require-File $script:SourceWalk 'source-art walk rig script'
  Require-File $script:QaScript 'QA script'
  Require-File $script:PoseQaScript 'OpenPose comparison QA script'
  Require-File $script:PublishScript 'publish script'
  Require-File $script:ComfyPython 'Comfy Python'

  $license = Get-Content -LiteralPath $script:PackReadme -Raw
  if ($license -notmatch 'commercial or free' -or $license -notmatch 'redistributing') {
    throw 'The GegX license language did not match the expected commercial-use/non-redistribution terms.'
  }

  try {
    $stats = Invoke-RestMethod -Uri "$($script:Config.comfyUrl)/system_stats" -TimeoutSec 10
    $nodes = Invoke-RestMethod -Uri "$($script:Config.comfyUrl)/object_info" -TimeoutSec 30
  } catch {
    throw "Save Point Comfy is not ready at $($script:Config.comfyUrl). This pipeline never starts it automatically. $($_.Exception.Message)"
  }

  $requiredNodes = @(
    'UNETLoader',
    'CLIPLoader',
    'VAELoader',
    'LoadImage',
    'FluxKontextImageScale',
    'TextEncodeQwenImageEditPlus',
    'FluxKontextMultiReferenceLatentMethod',
    'VAEEncode',
    'KSampler',
    'VAEDecode',
    'SaveImage',
    'LoraLoaderModelOnly',
    'OpenposePreprocessor',
    'ControlNetLoader',
    'ControlNetApplyAdvanced',
    'SetUnionControlNetType'
  )
  $missingNodes = @($requiredNodes | Where-Object { -not $nodes.PSObject.Properties[$_] })
  if ($missingNodes.Count) {
    throw "Missing Comfy nodes: $($missingNodes -join ', ')"
  }

  $serializedNodes = $nodes | ConvertTo-Json -Depth 12 -Compress
  $requiredModels = @(
    'qwen_image_edit_2511_fp8mixed.safetensors',
    'qwen_2.5_vl_7b_fp8_scaled.safetensors',
    'qwen_image_vae.safetensors',
    'Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors',
    'qwen-image-edit-2511-multiple-angles-lora.safetensors',
    'Qwen-Image-InstantX-ControlNet-Union.safetensors'
  )
  $missingModels = @($requiredModels | Where-Object { $serializedNodes -notmatch [regex]::Escape($_) })
  if ($missingModels.Count) {
    throw "Missing Comfy models: $($missingModels -join ', ')"
  }

  $device = $stats.devices[0]
  Write-Output "Comfy $($stats.system.comfyui_version)"
  Write-Output "Device $($device.name)"
  Write-Output "GegX license verified: project use allowed; source pack will not be published."
  Write-Output "PREFLIGHT-OK"
}

function Build-Lock {
  $appearance = @(
    $script:Config.identity.appearance.hair,
    $script:Config.identity.appearance.face,
    $script:Config.identity.appearance.top,
    $script:Config.identity.appearance.bottom,
    $script:Config.identity.appearance.shoes
  ) -join '; '
  $viewsReady = (Test-Path $script:SourceRight) -and (Test-Path $script:SourceDown) -and (Test-Path $script:SourceUp) -and (Test-Path $script:SourceLeft)
  if (-not $viewsReady -or $Force) {
    & $script:MakeViews `
    -APose $script:SourceAPose `
    -OutputDir $script:ViewRoot `
    -Appearance $appearance `
    -ComfyUrl $script:Config.comfyUrl `
    -Seed ([int64]$script:Config.identity.seed) `
    -Steps ([int]$script:Config.identity.steps)
  }
  Require-File $script:SourceRight 'generated three-quarter right source view'
  Require-File $script:SourceLeft 'generated three-quarter left source view'
  Require-File $script:SourceDown 'generated front-facing source view'
  Require-File $script:SourceUp 'generated back-facing source view'
  Invoke-Native 'Build pixel-matched chibi identity reference' {
    & py -3 $script:PixelReferenceScript `
      $script:SourceDown `
      $script:PixelReference `
      --width 0 `
      --height ([int]$script:Config.identity.pixelReferenceSize[1]) `
      --colors ([int]$script:Config.identity.pixelReferenceColors) `
      --tiny-output $script:TinyReference
  }
  Require-File $script:TinyReference 'tiny chibi rig reference'
  Require-File $script:PixelReference 'pixel-matched identity reference'
}

function Build-Template {
  $sets = @(
    @{ Name = 'right'; Directory = $script:TemplateDir; PackDirection = $script:Config.motion.directions.right; Plate = $script:SourceRight },
    @{ Name = 'down'; Directory = $script:TemplateDownDir; PackDirection = $script:Config.motion.directions.down; Plate = $script:SourceDown },
    @{ Name = 'up'; Directory = $script:TemplateUpDir; PackDirection = $script:Config.motion.directions.up; Plate = $script:SourceUp }
  )
  foreach ($set in $sets) {
    Reset-StageDirectory $set.Directory
    if ((Count-Frames $set.Directory 'frame-*.png') -eq $script:FrameCount -and -not $Force) {
      Write-Output "=== $($set.Name) GegX template exists, skip: $($set.Directory)"
      continue
    }
    Invoke-Native "Build GegX-aligned $($set.Name) walk template" {
      & $script:ComfyPython $script:PackTemplate $set.Directory `
        --pack $script:PackCharacter `
        --dir $set.PackDirection `
        --plate $set.Plate
    }
    Assert-FrameCount $set.Directory 'frame-*.png' $script:FrameCount "$($set.Name) walk template"
  }
}

function Build-Walk {
  if ($Force) {
    foreach ($directory in @($script:RawWalkDir, $script:RawWalkDownDir, $script:RawWalkUpDir)) {
      if (Test-Path $directory) {
        Remove-Item -LiteralPath $directory -Recurse -Force
      }
    }
  }
  if ($script:Config.motion.engine -eq 'gegx-template-controlnet') {
    $identityLine = if ($script:Config.identity.appearance.summary) {
      [string]$script:Config.identity.appearance.summary
    } else {
      @(
        'The target is the exact character in reference two.',
        "Hair: $($script:Config.identity.appearance.hair).",
        "Face: $($script:Config.identity.appearance.face).",
        "Top: $($script:Config.identity.appearance.top).",
        "Bottom: $($script:Config.identity.appearance.bottom).",
        "Footwear: $($script:Config.identity.appearance.shoes).",
        'Preserve the reference character head shape and proportions. Replace every template pixel belonging to the raincoat, hood, zombie skin, exposed teeth, and rain boots.'
      ) -join ' '
    }
    $sets = @(
      @{ Name = 'right'; Plate = $script:SourceRight; Template = $script:TemplateDir; Output = $script:RawWalkDir; Seed = [int]$script:Config.motion.seed },
      @{ Name = 'down'; Plate = $script:SourceDown; Template = $script:TemplateDownDir; Output = $script:RawWalkDownDir; Seed = [int]$script:Config.motion.seed + 100000 },
      @{ Name = 'up'; Plate = $script:SourceUp; Template = $script:TemplateUpDir; Output = $script:RawWalkUpDir; Seed = [int]$script:Config.motion.seed + 200000 }
    )
    foreach ($set in $sets) {
      Write-Output ""
      Write-Output "=== Reskin exact GegX $($set.Name) poses with identity + OpenPose control"
      & $script:Reskin `
        -Name $script:Config.name `
        -Plate $set.Plate `
        -TemplateDir $set.Template `
        -Action walk `
        -View $set.Name `
        -BaseSeed $set.Seed `
        -Denoise ([double]$script:Config.motion.denoise) `
        -ControlStrength ([double]$script:Config.motion.controlStrength) `
        -Steps ([int]$script:Config.motion.steps) `
        -Frames $script:EffectiveFrameCount `
        -Avoid $script:Config.motion.avoid `
        -Line $identityLine `
        -Force:$Force
      if ($LASTEXITCODE -ne 0) {
        throw "Exact-template $($set.Name) reskin failed with exit code $LASTEXITCODE"
      }
      Assert-FrameCount $set.Output 'frame-*.png' $script:EffectiveFrameCount "generated $($set.Name) walk"
    }
    return
  }
  if ($script:Config.motion.engine -eq 'source-sprite-rig') {
    Invoke-Native 'Render four-direction source-art walk' {
      & py -3 $script:SourceWalk `
        --source-right $script:SourceRight `
        --source-down $script:SourceDown `
        --source-up $script:SourceUp `
        --out-root $script:WorkRoot `
        --template-dir $script:TemplateDir `
        --frames $script:EffectiveFrameCount `
        --target-height ([int]$script:Config.output.height) `
        --supersample 4
    }
    foreach ($item in @(
      @($script:RawWalkDir, 'right'),
      @($script:RawWalkDownDir, 'down'),
      @($script:RawWalkUpDir, 'up')
    )) {
      Assert-FrameCount $item[0] 'frame-*.png' $script:EffectiveFrameCount "generated $($item[1]) walk"
    }
    return
  }
  if ($script:Config.motion.engine -eq 'deterministic-chibi-rig') {
    Require-File $script:TinyReference 'tiny chibi rig reference'
    Invoke-Native 'Render deterministic chibi walk' {
      & py -3 $script:RigWalk `
        --identity $script:TinyReference `
        --out $script:RawWalkDir `
        --tool-root $script:ToolRoot `
        --frames $script:EffectiveFrameCount `
        --target-height ([int]$script:Config.output.height) `
        --supersample 4
    }
    Assert-FrameCount $script:RawWalkDir 'frame-*.png' $script:EffectiveFrameCount 'generated walk'
    return
  }
  $identityLine = @(
    'Repaint every visible part of the moving figure completely as the single locked character.',
    "Hair: $($script:Config.identity.appearance.hair).",
    "Face: $($script:Config.identity.appearance.face).",
    "Top: $($script:Config.identity.appearance.top); both arms are covered by long gray sleeves from shoulder to wrist in every pose.",
    "Bottom: $($script:Config.identity.appearance.bottom).",
    "Footwear: $($script:Config.identity.appearance.shoes); both the planted boot and lifted boot are solid black in every frame.",
    'Replace every yellow, orange-coat and green-zombie region with Charlie''s gray, black, pink and skin colors.'
  ) -join ' '
  & $script:Reskin `
    -Name $script:Config.name `
    -Plate $script:PixelReference `
    -TemplateDir $script:TemplateDir `
    -Action walk `
    -View right `
    -BaseSeed ([int]$script:Config.motion.seed) `
    -Denoise ([double]$script:Config.motion.denoise) `
    -Steps ([int]$script:Config.motion.steps) `
    -Frames $script:EffectiveFrameCount `
    -Avoid $script:Config.motion.avoid `
    -Line $identityLine
  Assert-FrameCount $script:RawWalkDir 'frame-*.png' $script:EffectiveFrameCount 'generated walk'
}

function Process-Frames {
  $directions = @(
    @{ Name = 'right'; Raw = $script:RawWalkDir; Walk = $script:WalkRightDir; IdleRaw = $script:IdleRawDir; Idle = $script:IdleRightDir },
    @{ Name = 'down'; Raw = $script:RawWalkDownDir; Walk = $script:WalkDownDir; IdleRaw = $script:IdleDownRawDir; Idle = $script:IdleDownDir },
    @{ Name = 'up'; Raw = $script:RawWalkUpDir; Walk = $script:WalkUpDir; IdleRaw = $script:IdleUpRawDir; Idle = $script:IdleUpDir }
  )
  foreach ($direction in $directions) {
    Reset-StageDirectory $direction.Walk
    Invoke-Native "Cut and palette-lock $($direction.Name) walk" {
      & py -3 $script:FrameCut $direction.Raw $direction.Walk `
        $script:Config.output.height `
        $script:Config.output.colors `
        $script:Config.output.saturation `
        "$($script:Config.name.ToUpper()) WALK $($direction.Name.ToUpper())"
    }
    Assert-FrameCount $direction.Walk '*.png' $script:FrameCount "cut $($direction.Name) walk"

    Reset-StageDirectory $direction.IdleRaw
    $idleSource = Join-Path $direction.Raw 'frame-1.png'
    Require-File $idleSource "$($direction.Name)-facing idle source"
    Copy-Item -LiteralPath $idleSource -Destination (Join-Path $direction.IdleRaw 'frame-1.png') -Force
    Reset-StageDirectory $direction.Idle
    Invoke-Native "Cut $($direction.Name) idle" {
      & py -3 $script:FrameCut $direction.IdleRaw $direction.Idle `
        $script:Config.output.height `
        $script:Config.output.colors `
        $script:Config.output.saturation `
        "$($script:Config.name.ToUpper()) IDLE $($direction.Name.ToUpper())"
    }
  }

  Reset-StageDirectory $script:WalkLeftDir
  Invoke-Native 'Mirror right walk to left' {
    & py -3 $script:Mirror $script:WalkRightDir $script:WalkLeftDir -Label "$($script:Config.name.ToUpper()) WALK LEFT"
  }
  Reset-StageDirectory $script:IdleLeftDir
  Invoke-Native 'Mirror right idle to left' {
    & py -3 $script:Mirror $script:IdleRightDir $script:IdleLeftDir -Label "$($script:Config.name.ToUpper()) IDLE LEFT"
  }
  Assert-FrameCount $script:WalkLeftDir '*.png' $script:FrameCount 'cut left walk'
}

function Run-Qa {
  if ($script:Config.motion.engine -eq 'gegx-template-controlnet') {
    Invoke-Native 'Compare every generated pose against GegX with OpenPose' {
      & $script:ComfyPython $script:PoseQaScript --manifest $script:ManifestPath
    }
  }
  Invoke-Native 'Run sprite quality gates' {
    & py -3 $script:QaScript --manifest $script:ManifestPath
  }
}

function Publish-Pack {
  Invoke-Native 'Publish approved versioned pack' {
    & py -3 $script:PublishScript --manifest $script:ManifestPath
  }
}

$script:ManifestPath = [System.IO.Path]::GetFullPath($Manifest)
Require-File $script:ManifestPath 'pipeline manifest'
$script:Config = Get-Content -LiteralPath $script:ManifestPath -Raw | ConvertFrom-Json
$script:Core = [System.IO.Path]::GetFullPath($script:Config.coreRoot)
$script:ToolRoot = Resolve-CorePath $script:Config.toolRoot
$script:WorkRoot = Resolve-CorePath $script:Config.workRoot
$script:PublishRoot = Resolve-CorePath $script:Config.publishRoot
$script:SourceAPose = Resolve-CorePath $script:Config.identity.sourceAPose
$script:Benchmark = Resolve-CorePath $script:Config.identity.benchmark
$script:ViewRoot = Resolve-CorePath $script:Config.identity.viewRoot
$script:PixelReference = Resolve-CorePath $script:Config.identity.pixelReference
$script:TinyReference = Resolve-CorePath $script:Config.identity.tinyReference
$script:SourceRight = if ($script:Config.identity.views.right) { Resolve-CorePath $script:Config.identity.views.right } else { Join-Path $script:ViewRoot 'right.png' }
$script:SourceLeft = if ($script:Config.identity.views.left) { Resolve-CorePath $script:Config.identity.views.left } else { Join-Path $script:ViewRoot 'left.png' }
$script:SourceDown = if ($script:Config.identity.views.down) { Resolve-CorePath $script:Config.identity.views.down } else { Join-Path $script:ViewRoot 'down.png' }
$script:SourceUp = if ($script:Config.identity.views.up) { Resolve-CorePath $script:Config.identity.views.up } else { Join-Path $script:ViewRoot 'up.png' }
$script:PackCharacter = Resolve-CorePath $script:Config.motion.packCharacter
$script:PackReadme = Resolve-CorePath $script:Config.motion.packReadme
$script:ComfyPython = [System.IO.Path]::GetFullPath($script:Config.comfyPython)
$script:FrameCount = [int]$script:Config.motion.frameCount
$script:EffectiveFrameCount = if ($FrameLimit -gt 0) {
  [Math]::Min($FrameLimit, $script:FrameCount)
} else {
  $script:FrameCount
}

$script:MakeViews = Join-Path $PSScriptRoot 'make-views.ps1'
$script:PixelReferenceScript = Join-Path $PSScriptRoot 'pixel-reference.py'
$script:RigWalk = Join-Path $PSScriptRoot 'rig-walk.py'
$script:SourceWalk = Join-Path $PSScriptRoot 'source-walk.py'
$script:QaScript = Join-Path $PSScriptRoot 'qa.py'
$script:PoseQaScript = Join-Path $PSScriptRoot 'pose-qa.py'
$script:PublishScript = Join-Path $PSScriptRoot 'publish.py'
$script:PackTemplate = Join-Path $script:ToolRoot 'packtemplate.py'
$script:Reskin = Join-Path $script:ToolRoot 'reskin.ps1'
$script:FrameCut = Join-Path $script:ToolRoot 'frame_cut.py'
$script:Mirror = Join-Path $script:ToolRoot 'mirror.py'

$script:TemplateDir = Join-Path $script:WorkRoot 'templates\walk-right'
$script:TemplateDownDir = Join-Path $script:WorkRoot 'templates\walk-down'
$script:TemplateUpDir = Join-Path $script:WorkRoot 'templates\walk-up'
$script:RawWalkDir = Join-Path $script:WorkRoot 'move-walk-right'
$script:RawWalkDownDir = Join-Path $script:WorkRoot 'move-walk-down'
$script:RawWalkUpDir = Join-Path $script:WorkRoot 'move-walk-up'
$script:WalkRightDir = Join-Path $script:WorkRoot 'walk-right96'
$script:WalkLeftDir = Join-Path $script:WorkRoot 'walk-left96'
$script:WalkDownDir = Join-Path $script:WorkRoot 'walk-down96'
$script:WalkUpDir = Join-Path $script:WorkRoot 'walk-up96'
$script:IdleRawDir = Join-Path $script:WorkRoot 'idle-right-raw'
$script:IdleRightDir = Join-Path $script:WorkRoot 'idle-right96'
$script:IdleLeftDir = Join-Path $script:WorkRoot 'idle-left96'
$script:IdleDownRawDir = Join-Path $script:WorkRoot 'idle-down-raw'
$script:IdleDownDir = Join-Path $script:WorkRoot 'idle-down96'
$script:IdleUpRawDir = Join-Path $script:WorkRoot 'idle-up-raw'
$script:IdleUpDir = Join-Path $script:WorkRoot 'idle-up96'

New-Item -ItemType Directory -Force -Path $script:WorkRoot | Out-Null

switch ($Stage) {
  'preflight' { Test-Preflight }
  'lock' { Test-Preflight; Build-Lock }
  'template' { Test-Preflight; Require-File $script:PixelReference 'pixel identity reference'; Build-Template }
  'walk' { Test-Preflight; Require-File $script:PixelReference 'pixel identity reference'; Build-Template; Build-Walk }
  'process' { Test-Preflight; Process-Frames }
  'qa' { Test-Preflight; Run-Qa }
  'publish' { Test-Preflight; Publish-Pack }
  'all' {
    Test-Preflight
    Build-Lock
    Build-Template
    Build-Walk
    Process-Frames
    Run-Qa
    Publish-Pack
  }
}
