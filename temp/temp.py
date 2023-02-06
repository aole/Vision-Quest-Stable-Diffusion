from PIL import Image
import torch
import numpy

from pipelines.basepipeline import BasePipeline

device = "cuda" if torch.cuda.is_available() else 'cpu'

pipe = BasePipeline.from_pretrained(
    'runwayml/stable-diffusion-v1-5',
    torch_dtype=torch.float16,
    revision="fp16",
)
pipe.enable_xformers_memory_efficient_attention()

pipe = pipe.to(device)

image = Image.open('temp/test.png')
mask = Image.open('temp/image_3.png')

images = pipe(
    prompt='humming bird',
    image=image,
    mask=mask,
    strength=.85,
    width=512,
    height=512,
    batch_size=4,
    num_inference_steps=20,
    guidance_scale=7.5,
    negative_prompt='cropped, deformed',
)

for i, image in enumerate(images):
    image.save(f'temp/test{i}.png')
