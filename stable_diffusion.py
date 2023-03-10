# stable_diffusion.py

from pipelines.basepipeline import BasePipeline

import diffusers as df
from diffusers import StableDiffusionInpaintPipeline

import torch
import os

cache_dir = df.utils.DIFFUSERS_CACHE
repo_type = "model"

model_id = "runwayml/stable-diffusion-v1-5"

device = "cuda" if torch.cuda.is_available() else 'cpu'

scheduler_sel = 'Euler A'
scheduler_names = ['Euler', 'Euler A', 'DDIM', 'DDPM', 'DPM Solver', 'LMS', 'PNDM']
scheduler_use = df.EulerAncestralDiscreteScheduler
schedulers = [df.EulerDiscreteScheduler,
    df.EulerAncestralDiscreteScheduler,
    df.DDIMScheduler,
    df.DDPMScheduler,
    df.DPMSolverMultistepScheduler,
    df.LMSDiscreteScheduler,
    df.PNDMScheduler]
    
def sd_get_cached_models_list():
    models = []

    for repo_cache in os.listdir(cache_dir):
        if os.path.isdir(os.path.join(cache_dir, repo_cache)):
            object_id = repo_cache[len(f"{repo_type}s--"):]
            model_id = object_id.replace("--", "/")
            models.append(model_id)
    return models

def sd_generate(prompt, width=512, height=512, image=None, mask=None, negative='', steps=20, guidance=7.5, noise=.8, batch_size=1):
    print(f'generate ({model_id} - {scheduler_sel}) {prompt}')
    
    if device == 'cpu':
        pipe = BasePipeline.from_pretrained(
            model_id,
        )
    else:
        pipe = BasePipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
            revision="fp16",
        )
        pipe.enable_xformers_memory_efficient_attention()
    
    pipe.scheduler = scheduler_use.from_config(pipe.scheduler.config)
    pipe = pipe.to(device)
    
    images = pipe(prompt=prompt, width=width, height=height, image=image, mask=mask, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative, strength=noise, batch_size=batch_size)
    
    return images
    
def sd_generate_out(prompt, image, mask, width=512, height=512, negative='', steps=20, guidance=7.5, batch_size=1):
    model_id_inp = 'runwayml/stable-diffusion-inpainting'
    print(f'generate out ({model_id_inp} - {scheduler_sel}) {prompt}')
    
    if device == 'cpu':
        pipe = StableDiffusionInpaintPipeline.from_pretrained(
            model_id_inp,
        )
    else:
        pipe = StableDiffusionInpaintPipeline.from_pretrained(
            model_id_inp,
            torch_dtype=torch.float16,
            revision="fp16",
        )
        pipe.enable_xformers_memory_efficient_attention()


    pipe.scheduler = scheduler_use.from_config(pipe.scheduler.config)
    pipe = pipe.to(device)
    
    images = pipe(prompt=prompt, width=width, height=height, image=image, mask_image=mask, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative, num_images_per_prompt=batch_size).images
    
    return images
    
def sd_get_model_id():
    return model_id
    
def sd_change_model(mid):
    global model_id
    print('please wait ...', flush=True)
    try:
        pipe = BasePipeline.from_pretrained(mid, safety_checker=None)
        model_id = mid
        print('Success changing model to', mid, flush=True)
    except:
        print('Error changing model to', mid, flush=True)
        
    return model_id
    
def sd_change_scheduler(scheduler):
    global scheduler_sel
    
    idx = scheduler_names.index(scheduler)
    scheduler_sel = scheduler
    scheduler_use = schedulers[idx]
    
    return scheduler
    