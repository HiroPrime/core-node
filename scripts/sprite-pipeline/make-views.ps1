param(
  [Parameter(Mandatory = $true)][string]$APose,
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [Parameter(Mandatory = $true)][string]$Appearance,
  [string]$ComfyUrl = 'http://127.0.0.1:8188',
  [int64]$Seed = 260301,
  [int]$Steps = 4
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Upload-Comfy([string]$Path, [string]$AsName) {
  $temp = Join-Path $env:TEMP $AsName
  Copy-Item $Path $temp -Force
  $response = curl.exe -s -X POST -F "image=@$temp;type=image/png" -F "overwrite=true" "$ComfyUrl/upload/image" | ConvertFrom-Json
  if (-not $response.name) { throw "Comfy upload failed for $Path" }
  return $response.name
}

function Queue-Comfy($Graph) {
  $body = @{ prompt = $Graph; client_id = 'core-sprite-views' } | ConvertTo-Json -Depth 14 -Compress
  $response = Invoke-RestMethod -Uri "$ComfyUrl/prompt" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 60
  if (-not $response.prompt_id) { throw 'Comfy did not return a prompt id.' }
  return $response.prompt_id
}

function Wait-Download([string]$PromptId, [string]$Destination, [int]$TimeoutSeconds = 1800) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $history = Invoke-RestMethod -Uri "$ComfyUrl/history/$PromptId" -TimeoutSec 30
    $entry = $history.PSObject.Properties[$PromptId]
    if ($entry) {
      foreach ($node in $entry.Value.outputs.PSObject.Properties) {
        foreach ($image in $node.Value.images) {
          if ($image -and $image.filename) {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
            $url = "$ComfyUrl/view?filename=$([uri]::EscapeDataString($image.filename))&subfolder=$($image.subfolder)&type=$($image.type)"
            Invoke-WebRequest -Uri $url -OutFile $Destination -TimeoutSec 120 -UseBasicParsing | Out-Null
            return
          }
        }
      }
      if ($entry.Value.status.status_str -eq 'error') {
        throw "Comfy directional-view job failed: $PromptId"
      }
    }
    Start-Sleep -Seconds 5
  }
  throw "Timed out waiting for Comfy directional-view job: $PromptId"
}

if (-not (Test-Path $APose)) { throw "Missing A-pose: $APose" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$sourceUpload = Upload-Comfy $APose 'core_sprite_a_pose.png'

# A-frame in, four direction locks out. Sides are three-quarter sidewalk,
# same camera as the walk pack — a little off is fine. Do not flatten them
# into a one-eye side profile; that is what made the far leg disappear.
$views = @(
  @{
    Name = 'down'
    Camera = 'Straight-on front view, facing the camera, head and body square to camera.'
    Denoise = 0.80
    Angles = $false
    Strength = 0.0
  },
  @{
    Name = 'right'
    Camera = 'Three-quarter sidewalk view facing screen-right. Body turned a little toward the camera so the face and both legs read. A little off is fine. Not a flat side profile.'
    Denoise = 0.88
    Angles = $true
    Strength = 1.0
  },
  @{
    Name = 'left'
    Camera = 'Three-quarter sidewalk view facing screen-left. Body turned a little toward the camera so the face and both legs read. A little off is fine. Not a flat side profile.'
    Denoise = 0.88
    Angles = $true
    Strength = 1.0
  },
  @{
    Name = 'up'
    Camera = 'Back view facing directly away from the camera, back of head and outfit visible, no face.'
    Denoise = 0.90
    Angles = $true
    Strength = 1.0
  }
)

$negative = @"
second person, duplicate, twin, multiple figures, lineup, character sheet, grid,
cropped head, cropped feet, changed hairstyle, skirt, pleated skirt, dress,
missing clothes, photorealistic, 3d, cgi, text, logo, watermark, blurry, extra limbs,
strict side profile, one-eye silhouette
"@ -replace '\s+', ' '

for ($index = 0; $index -lt $views.Count; $index++) {
  $view = $views[$index]
  $destination = Join-Path $OutputDir "$($view.Name).png"
  $prompt = @"
Turn the exact same single character from the reference into this camera:
$($view.Camera) Keep the reference character's identity, stylization, chibi
proportions, head-to-body ratio, facial design, hair silhouette, body shape,
outfit construction, shoes, colors, linework and shading. Appearance lock:
$Appearance. Neutral relaxed A-pose, arms separated clearly from the torso,
legs separated clearly from each other, full body centered, head and shoes
fully visible, plain uniform light-gray studio background. One person only.
"@ -replace '\s+', ' '

  $graph = @{
    '1' = @{ class_type = 'UNETLoader'; inputs = @{ unet_name = 'qwen_image_edit_2511_fp8mixed.safetensors'; weight_dtype = 'default' } }
    '2' = @{ class_type = 'CLIPLoader'; inputs = @{ clip_name = 'qwen_2.5_vl_7b_fp8_scaled.safetensors'; type = 'qwen_image'; device = 'default' } }
    '3' = @{ class_type = 'VAELoader'; inputs = @{ vae_name = 'qwen_image_vae.safetensors' } }
    '4' = @{ class_type = 'LoadImage'; inputs = @{ image = $sourceUpload } }
    '5' = @{ class_type = 'FluxKontextImageScale'; inputs = @{ image = @('4', 0) } }
    '6' = @{ class_type = 'TextEncodeQwenImageEditPlus'; inputs = @{ clip = @('2', 0); vae = @('3', 0); image1 = @('5', 0); prompt = $prompt } }
    '7' = @{ class_type = 'TextEncodeQwenImageEditPlus'; inputs = @{ clip = @('2', 0); vae = @('3', 0); image1 = @('5', 0); prompt = $negative } }
    '8' = @{ class_type = 'FluxKontextMultiReferenceLatentMethod'; inputs = @{ conditioning = @('6', 0); reference_latents_method = 'index_timestep_zero' } }
    '9' = @{ class_type = 'FluxKontextMultiReferenceLatentMethod'; inputs = @{ conditioning = @('7', 0); reference_latents_method = 'index_timestep_zero' } }
    '10' = @{ class_type = 'VAEEncode'; inputs = @{ pixels = @('5', 0); vae = @('3', 0) } }
    '11' = @{
      class_type = 'KSampler'
      inputs = @{
        seed = $Seed + $index * 7919
        steps = $Steps
        cfg = 1.0
        sampler_name = 'euler'
        scheduler = 'simple'
        denoise = $view.Denoise
        model = if ($view.Angles) { @('15', 0) } else { @('14', 0) }
        positive = @('8', 0)
        negative = @('9', 0)
        latent_image = @('10', 0)
      }
    }
    '12' = @{ class_type = 'VAEDecode'; inputs = @{ samples = @('11', 0); vae = @('3', 0) } }
    '13' = @{ class_type = 'SaveImage'; inputs = @{ images = @('12', 0); filename_prefix = "CORE/source-views/$($view.Name)" } }
    '14' = @{ class_type = 'LoraLoaderModelOnly'; inputs = @{ model = @('1', 0); lora_name = 'Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors'; strength_model = 1.0 } }
  }
  if ($view.Angles) {
    $graph['15'] = @{
      class_type = 'LoraLoaderModelOnly'
      inputs = @{
        model = @('14', 0)
        lora_name = 'qwen-image-edit-2511-multiple-angles-lora.safetensors'
        strength_model = $view.Strength
      }
    }
  }

  Write-Output "Queue source view $($view.Name): denoise=$($view.Denoise)"
  $promptId = Queue-Comfy $graph
  Wait-Download $promptId $destination
  Write-Output "VIEW-OK $destination"
}
