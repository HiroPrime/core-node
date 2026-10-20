param(
  [string]$ComfyUrl = 'http://127.0.0.1:8188',
  [string]$Reference = '',
  [string]$OutputDir = '',
  [int64]$Seed = 261017,
  [int]$Steps = 4
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $Reference) { $Reference = Join-Path $root 'logs\neon-chase\ref-car.jpg' }
if (-not $OutputDir) { $OutputDir = Join-Path $root 'logs\neon-chase\generated' }

function Upload-Comfy([string]$Path, [string]$AsName) {
  $temp = Join-Path $env:TEMP $AsName
  Copy-Item $Path $temp -Force
  $response = curl.exe -s -X POST -F "image=@$temp;type=image/jpeg" -F "overwrite=true" "$ComfyUrl/upload/image" | ConvertFrom-Json
  if (-not $response.name) { throw "Comfy upload failed for $Path" }
  return $response.name
}

function Queue-Comfy($Graph) {
  $body = @{ prompt = $Graph; client_id = 'core-neon-chase' } | ConvertTo-Json -Depth 16 -Compress
  $response = Invoke-RestMethod -Uri "$ComfyUrl/prompt" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 60
  if (-not $response.prompt_id) { throw 'Comfy did not return a prompt id.' }
  return $response.prompt_id
}

function Wait-Download([string]$PromptId, [string]$Destination, [int]$TimeoutSeconds = 900) {
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
        throw "Comfy car job failed: $PromptId"
      }
    }
    Start-Sleep -Seconds 4
  }
  throw "Timed out waiting for Comfy car job: $PromptId"
}

if (-not (Test-Path $Reference)) { throw "Missing car reference: $Reference" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$sourceUpload = Upload-Comfy $Reference 'neon_chase_ref_car.jpg'

$negative = @"
front view, nose of the car, strict side profile, top-down, interior, driver,
scenery, road, grid, mountains, city, palm trees, sky, text, logo, watermark,
photorealistic, 3d render, blurry, anti-aliased, multiple cars, cropped car,
people, character
"@ -replace '\s+', ' '

$views = @(
  @{
    Name = 'player-back'
    Prompt = 'Redraw the reference pink neon sports car as one isolated game sprite. Camera is the classic SNES racer: low, directly behind the car, rear bumper and both taillights facing us, a little of each rear quarter, not a side view. Keep the magenta body, louvered rear glass, red taillight bars, and cyan thruster flames. Hard 16-bit pixels, chunky and crisp, black outline. One car, large, fully in frame including wheels and flames. Flat solid dark navy background only.'
  },
  @{
    Name = 'player-left'
    Prompt = 'Same pink neon sports car sprite, same 16-bit pixels, same flat dark navy background. The car is turning slightly left: still mostly the rear, with a little of the left side showing, body leaned a few degrees. Not a full side view. Cyan thrusters stay on. One car, fully in frame.'
  },
  @{
    Name = 'player-right'
    Prompt = 'Same pink neon sports car sprite, same 16-bit pixels, same flat dark navy background. The car is turning slightly right: still mostly the rear, with a little of the right side showing, body leaned a few degrees. Not a full side view. Cyan thrusters stay on. One car, fully in frame.'
  },
  @{
    Name = 'cop-back'
    Prompt = 'One police pursuit car game sprite in the same 16-bit pixel style and the same low rear camera as the reference sports car. Black cruiser, white doors, lit red and blue roof light bar, seen from behind with a little of each rear quarter. Hard pixels, black outline, flat solid dark navy background. One car, fully in frame, no scenery, no text.'
  }
)

for ($index = 0; $index -lt $views.Count; $index++) {
  $view = $views[$index]
  $destination = Join-Path $OutputDir "$($view.Name).png"
  $prompt = $view.Prompt -replace '\s+', ' '
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
        denoise = 0.96
        model = @('14', 0)
        positive = @('8', 0)
        negative = @('9', 0)
        latent_image = @('10', 0)
      }
    }
    '12' = @{ class_type = 'VAEDecode'; inputs = @{ samples = @('11', 0); vae = @('3', 0) } }
    '13' = @{ class_type = 'SaveImage'; inputs = @{ images = @('12', 0); filename_prefix = "CORE/neon-chase/$($view.Name)" } }
    '14' = @{ class_type = 'LoraLoaderModelOnly'; inputs = @{ model = @('1', 0); lora_name = 'Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors'; strength_model = 1.0 } }
  }

  Write-Output "Queue $($view.Name)"
  $promptId = Queue-Comfy $graph
  Wait-Download $promptId $destination
  Write-Output "CAR-OK $destination"
}
