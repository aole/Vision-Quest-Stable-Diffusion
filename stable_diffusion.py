# stable_diffusion.py

from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline, StableDiffusionInpaintPipeline
import torch
import tempfile
import torch

imgfile = 'static/images/image.png'
    
model_id = "runwayml/stable-diffusion-v1-5"
# model_id = "CompVis/stable-diffusion-v1-4"

device = "cuda"

def sd_txt2img(prompt, negative='', steps=20):
    pipe = StableDiffusionPipeline.from_pretrained(model_id, safety_checker=None)
    pipe = pipe.to(device)
    image = pipe(prompt=prompt, num_inference_steps=steps).images[0]
    
    image.save(imgfile)
    
def generate_image(text="a photo of an astronaut riding a horse on mars", img=None, msk=None, steps=1, use_gpu=False):
    global pipe, device
    
    print('Prompt:', text)
    print('Filename:', imgfile)
    print('Use GPU:', use_gpu)
    
    if not use_gpu and device=='cuda':
        device = "cpu"
    elif use_gpu and device=='cpu':
        device = "cuda"
    
    if img==None:
        # add parameter torch_dtype=torch.float16 to limit VRAM to 4GB
        # pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
        pipe = StableDiffusionPipeline.from_pretrained(model_id, safety_checker=None)
        pipe = pipe.to(device)
        image = pipe(prompt=text, num_inference_steps=steps).images[0]
    elif img!=None and msk==None:
        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(model_id, safety_checker=None)
        pipe = pipe.to(device)
        image = pipe(prompt=text, image=img, num_inference_steps=steps).images[0]
    elif img!=None and msk!=None:
        pipe = StableDiffusionInpaintPipeline.from_pretrained("runwayml/stable-diffusion-inpainting", safety_checker=None)
        # pipe = StableDiffusionInpaintPipeline.from_pretrained(model_id, safety_checker=None)
        pipe = pipe.to(device)
        image = pipe(prompt=text, image=img, mask_image=msk, num_inference_steps=steps).images[0]
    else:
        print('error: stable_diffusion.generate_image');
        return img
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
    
    # assert callback_fn.has_been_called
        
    image.save(imgfile)
    
    return imgfile
