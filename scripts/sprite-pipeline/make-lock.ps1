param(
  [Parameter(Mandatory = $true)][string]$BaseSide,
  [Parameter(Mandatory = $true)][string]$FaceReference,
  [Parameter(Mandatory = $true)][string]$Output,
  [Parameter(Mandatory = $true)][string]$Appearance,
  [string]$ComfyUrl = 'http://127.0.0.1:8188',
  [int64]$Seed = 260101,
  [double]$Denoise = 0.78,
  [int]$Steps = 4
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Upload-Comfy([string]$Path, [string]$AsName) {
  $temp = Join-Path $env:TEMP $AsName
  Copy-Item $Path $temp -Force
  $response = curl.exe -s -X POST -F "image=@$temp;type=image/png" -F "overwrite=true" "$ComfyUrl/upload/image" | ConvertFrom-Json
  if (-not $response.name) {
    throw "Comfy upload failed for $Path"
  }
  return $response.name
}

function Queue-Comfy($Graph) {
  $body = @{ prompt = $Graph; client_id = 'core-sprite-pipeline' } |
    ConvertTo-Json -Depth 14 -Compress
  $response = Invoke-RestMethod -Uri "$ComfyUrl/prompt" -Method Post -Body $body `
    -ContentType 'application/json' -TimeoutSec 60
  if (-not $response.prompt_id) {
    throw 'Comfy did not return a prompt id.'
  }
  return $response.prompt_id
}

function Wait-Download([string]$PromptId, [string]$Destination, [int]$TimeoutSeconds = 1800) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $history = Invoke-RestMethod -Uri "$ComfyUrl/history" -TimeoutSec 30
    $entry = $history.PSObject.Properties[$PromptId]
    if ($entry) {
      $job = $entry.Value
      if ($job.outputs) {
        foreach ($node in $job.outputs.PSObject.Properties) {
          foreach ($image in $node.Value.images) {
            if ($image -and $image.filename) {
              $parent = Split-Path -Parent $Destination
              if ($parent) {
                New-Item -ItemType Directory -Force -Path $parent | Out-Null
              }
              $url = "$ComfyUrl/view?filename=$([uri]::EscapeDataString($image.filename))&subfolder=$($image.subfolder)&type=$($image.type)"
              Invoke-WebRequest -Uri $url -OutFile $Destination -TimeoutSec 120 -UseBasicParsing | Out-Null
              return
            }
          }
        }
      }
      if ($job.status.status_str -eq 'error') {
        throw "Comfy lock job failed: $PromptId"
      }
    }
    Start-Sleep -Seconds 5
  }
  throw "Timed out waiting for Comfy lock job: $PromptId"
}

if (-not (Test-Path $BaseSide)) {
  throw "Missing side reference: $BaseSide"
}
if (-not (Test-Path $FaceReference)) {
  throw "Missing face reference: $FaceReference"
}

$baseUpload = Upload-Comfy $BaseSide 'core_charlie_lock_base.png'
$faceUpload = Upload-Comfy $FaceReference 'core_charlie_lock_face.png'

$prompt = @"
Create one clean full-body orthographic side-profile identity plate of the exact same woman.
Keep the pose, screen-left facing direction, body proportions, scale, placement, hands, legs,
feet, hair silhouette and flat studio framing from the FIRST image. Preserve the character's
facial identity from the SECOND image. Keep these exact appearance anchors: $Appearance.
Preserve the FIRST image's exaggerated chibi design exactly: very large head and eyes, compact
torso, short limbs, small hands and chunky oversized boots. Do not make her taller or realistic.
Change only the lower garment from a pleated skirt into fitted high-waisted black shorts with
two separate leg openings and a visible strip of upper thigh. The result must show exactly one
complete person, head and both boots fully in frame, on the same plain neutral studio backdrop.
Clean high-quality 2D illustrated character art, firm dark linework, flat controlled shading.
"@ -replace '\s+', ' '

$negative = @"
skirt, pleated skirt, dress, cargo pants, long pants, jeans, yellow coat, raincoat, hood,
green skin, zombie, second person, duplicate, twin, multiple figures, character sheet,
turnaround, split panel, collage, cropped feet, cropped head, front view, three-quarter view,
back view, changed pose, changed hairstyle, blonde hair, purple hair, photorealistic, 3d,
pixar, text, letters, logo, watermark, motion lines, blurry, deformed, extra limbs
"@ -replace '\s+', ' '

$graph = @{
  '1' = @{
    class_type = 'UNETLoader'
    inputs = @{ unet_name = 'qwen_image_edit_2511_fp8mixed.safetensors'; weight_dtype = 'default' }
  }
  '2' = @{
    class_type = 'CLIPLoader'
    inputs = @{ clip_name = 'qwen_2.5_vl_7b_fp8_scaled.safetensors'; type = 'qwen_image'; device = 'default' }
  }
  '3' = @{ class_type = 'VAELoader'; inputs = @{ vae_name = 'qwen_image_vae.safetensors' } }
  '4' = @{ class_type = 'LoadImage'; inputs = @{ image = $baseUpload } }
  '5' = @{ class_type = 'FluxKontextImageScale'; inputs = @{ image = @('4', 0) } }
  '6' = @{
    class_type = 'TextEncodeQwenImageEditPlus'
    inputs = @{
      clip = @('2', 0)
      vae = @('3', 0)
      image1 = @('5', 0)
      image2 = @('15', 0)
      prompt = $prompt
    }
  }
  '7' = @{
    class_type = 'TextEncodeQwenImageEditPlus'
    inputs = @{
      clip = @('2', 0)
      vae = @('3', 0)
      image1 = @('5', 0)
      image2 = @('15', 0)
      prompt = $negative
    }
  }
  '8' = @{
    class_type = 'FluxKontextMultiReferenceLatentMethod'
    inputs = @{ conditioning = @('6', 0); reference_latents_method = 'index_timestep_zero' }
  }
  '9' = @{
    class_type = 'FluxKontextMultiReferenceLatentMethod'
    inputs = @{ conditioning = @('7', 0); reference_latents_method = 'index_timestep_zero' }
  }
  '10' = @{ class_type = 'VAEEncode'; inputs = @{ pixels = @('5', 0); vae = @('3', 0) } }
  '11' = @{
    class_type = 'KSampler'
    inputs = @{
      seed = $Seed
      steps = $Steps
      cfg = 1.0
      sampler_name = 'euler'
      scheduler = 'simple'
      denoise = $Denoise
      model = @('14', 0)
      positive = @('8', 0)
      negative = @('9', 0)
      latent_image = @('10', 0)
    }
  }
  '12' = @{ class_type = 'VAEDecode'; inputs = @{ samples = @('11', 0); vae = @('3', 0) } }
  '13' = @{
    class_type = 'SaveImage'
    inputs = @{ images = @('12', 0); filename_prefix = 'CORE/charlie-brawler-v1/lock-side-shorts' }
  }
  '14' = @{
    class_type = 'LoraLoaderModelOnly'
    inputs = @{
      model = @('1', 0)
      lora_name = 'Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors'
      strength_model = 1.0
    }
  }
  '15' = @{ class_type = 'LoadImage'; inputs = @{ image = $faceUpload } }
}

Write-Output "Queue Charlie shorts identity lock: denoise=$Denoise steps=$Steps seed=$Seed"
$promptId = Queue-Comfy $graph
Write-Output "Prompt: $promptId"
Wait-Download $promptId $Output
Write-Output "LOCK-OK $Output"
