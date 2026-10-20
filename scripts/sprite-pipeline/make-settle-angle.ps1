param(
  [string]$ComfyUrl = 'http://127.0.0.1:8188',
  [double]$Denoise = 0.5,
  [int64]$Seed = 261101
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$reference = Join-Path $root 'logs\neon-chase\generated\player-back.png'
$destination = Join-Path $root 'logs\neon-chase\generated\settle-right.png'

function Upload-Comfy([string]$Path, [string]$AsName) {
  $temp = Join-Path $env:TEMP $AsName
  Copy-Item $Path $temp -Force
  $response = curl.exe -s -X POST -F "image=@$temp;type=image/png" -F "overwrite=true" "$ComfyUrl/upload/image" | ConvertFrom-Json
  if (-not $response.name) { throw "Comfy upload failed for $Path" }
  return $response.name
}

$source = Upload-Comfy $reference 'neon_chase_straight_back.png'
$prompt = @'
Keep this exact pink neon sports car. Same pixels, same size, same rear window, same red taillights, same cyan thrusters, same flat dark navy background. Yaw the camera only a few degrees. The rear bumper still faces the camera and both taillights stay visible. A narrow sliver of the right side of the car is now visible, just enough to show it is not aimed dead straight. Not a three-quarter view. Not a side view. One car, fully in frame.
'@ -replace '\s+', ' '
$negative = 'side profile, three-quarter view, front view, large side panel, door facing camera, scenery, road, text, logo, watermark, NEXUS, different car, cropped, photorealistic' -replace '\s+', ' '

$graph = @{
  '1' = @{ class_type = 'UNETLoader'; inputs = @{ unet_name = 'qwen_image_edit_2511_fp8mixed.safetensors'; weight_dtype = 'default' } }
  '2' = @{ class_type = 'CLIPLoader'; inputs = @{ clip_name = 'qwen_2.5_vl_7b_fp8_scaled.safetensors'; type = 'qwen_image'; device = 'default' } }
  '3' = @{ class_type = 'VAELoader'; inputs = @{ vae_name = 'qwen_image_vae.safetensors' } }
  '4' = @{ class_type = 'LoadImage'; inputs = @{ image = $source } }
  '5' = @{ class_type = 'FluxKontextImageScale'; inputs = @{ image = @('4', 0) } }
  '6' = @{ class_type = 'TextEncodeQwenImageEditPlus'; inputs = @{ clip = @('2', 0); vae = @('3', 0); image1 = @('5', 0); prompt = $prompt } }
  '7' = @{ class_type = 'TextEncodeQwenImageEditPlus'; inputs = @{ clip = @('2', 0); vae = @('3', 0); image1 = @('5', 0); prompt = $negative } }
  '8' = @{ class_type = 'FluxKontextMultiReferenceLatentMethod'; inputs = @{ conditioning = @('6', 0); reference_latents_method = 'index_timestep_zero' } }
  '9' = @{ class_type = 'FluxKontextMultiReferenceLatentMethod'; inputs = @{ conditioning = @('7', 0); reference_latents_method = 'index_timestep_zero' } }
  '10' = @{ class_type = 'VAEEncode'; inputs = @{ pixels = @('5', 0); vae = @('3', 0) } }
  '11' = @{
    class_type = 'KSampler'
    inputs = @{
      seed = $Seed
      steps = 4
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
  '13' = @{ class_type = 'SaveImage'; inputs = @{ images = @('12', 0); filename_prefix = 'CORE/neon-chase/settle-right' } }
  '14' = @{ class_type = 'LoraLoaderModelOnly'; inputs = @{ model = @('1', 0); lora_name = 'Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors'; strength_model = 1.0 } }
}

$body = @{ prompt = $graph; client_id = 'core-neon-chase' } | ConvertTo-Json -Depth 16 -Compress
$response = Invoke-RestMethod -Uri "$ComfyUrl/prompt" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 60
if (-not $response.prompt_id) { throw 'Comfy did not return a prompt id.' }
Write-Output "Queue $($response.prompt_id) denoise=$Denoise"
$deadline = (Get-Date).AddMinutes(8)
while ((Get-Date) -lt $deadline) {
  $history = Invoke-RestMethod -Uri "$ComfyUrl/history/$($response.prompt_id)" -TimeoutSec 30
  $entry = $history.PSObject.Properties[$response.prompt_id]
  if ($entry) {
    foreach ($node in $entry.Value.outputs.PSObject.Properties) {
      foreach ($image in $node.Value.images) {
        if ($image -and $image.filename) {
          $url = "$ComfyUrl/view?filename=$([uri]::EscapeDataString($image.filename))&subfolder=$($image.subfolder)&type=$($image.type)"
          Invoke-WebRequest -Uri $url -OutFile $destination -TimeoutSec 120 -UseBasicParsing | Out-Null
          Write-Output "CAR-OK $destination"
          return
        }
      }
    }
    if ($entry.Value.status.status_str -eq 'error') { throw "Comfy settle job failed" }
  }
  Start-Sleep -Seconds 3
}
throw 'Timed out waiting for settle angle'
