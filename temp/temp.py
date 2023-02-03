
import torch

from pipelines.basepipeline import BasePipeline

device = "cuda" if torch.cuda.is_available() else 'cpu'

pipe = BasePipeline.from_pretrained(
    'runwayml/stable-diffusion-v1-5',
    torch_dtype=torch.float16,
    revision="fp16",
)
pipe = pipe.to(device)

images = pipe(
    prompt='beautiful house, country side, hills, trees, lake',
    num_inference_steps=20,
    guidance_scale=7.5,
    width=768,
    height=512,
    negative_prompt='cropped, deformed',
)

images[0].save('temp/test.png')
