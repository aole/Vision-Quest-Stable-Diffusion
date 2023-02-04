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

image = Image.open('temp/img1.jpg')

images = pipe(
    prompt='beautiful house, country side, hills, trees, lake',
    image=image,
    strength=0.75,
    width=768,
    height=512,
    batch_size=4,
    num_inference_steps=20,
    guidance_scale=7.5,
    negative_prompt='red, cropped, deformed',
)

for i, image in enumerate(images):
    image.save(f'temp/test{i}.png')
