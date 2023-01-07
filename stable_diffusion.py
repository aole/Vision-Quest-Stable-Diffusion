# stable_diffusion.py

from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
import torch
import tempfile
import torch

imgfile = 'static/images/image.png'
    
model_id = "runwayml/stable-diffusion-v1-5"
# model_id = "CompVis/stable-diffusion-v1-4"

device = "cpu"

# add parameter torch_dtype=torch.float16 to limit VRAM to 4GB
# pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
pipe = StableDiffusionPipeline.from_pretrained(model_id, safety_checker=None)
pipe = pipe.to(device)

def generate_image(text="a photo of an astronaut riding a horse on mars", steps=1, use_gpu=False):
    global pipe, device
    
    print('Prompt:', text)
    print('Filename:', imgfile)
    print('Use GPU:', use_gpu)
    
    if not use_gpu and device=='cuda':
        device = "cpu"
        pipe = StableDiffusionPipeline.from_pretrained(model_id, safety_checker=None)
        pipe = pipe.to(device)
    elif use_gpu and device=='cpu':
        device = "cuda"
        pipe = StableDiffusionPipeline.from_pretrained(model_id, safety_checker=None)
        pipe = pipe.to(device)
    '''
    def callback_fn(step: int, timestep: int, latents: torch.FloatTensor):
        callback_fn.has_been_called = True
        if timestep == 0:
            progress = 0
        else:
            progress = step / timestep
            
        yield progress

    callback_fn.has_been_called = False
    '''
    # pipe.set_progress_bar_config(disable=None)
    # pipe.enable_attention_slicing()
    
    #image = pipe(text, num_inference_steps=steps, callback=callback_fn, callback_steps=1).images[0]
    image = pipe(text, num_inference_steps=steps).images[0]

    # assert callback_fn.has_been_called
        
    image.save(imgfile)
    
    return imgfile
