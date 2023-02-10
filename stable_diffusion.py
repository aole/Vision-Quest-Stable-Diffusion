# stable_diffusion.py

from pipelines.basepipeline import BasePipeline

import diffusers as df
import torch
import os

cache_dir = df.utils.DIFFUSERS_CACHE
repo_type = "model"

model_id = "runwayml/stable-diffusion-v1-5"

device = "cuda" if torch.cuda.is_available() else 'cpu'

def sd_get_cached_models_list():
    models = []

    for repo_cache in os.listdir(cache_dir):
        if os.path.isdir(os.path.join(cache_dir, repo_cache)):
            object_id = repo_cache[len(f"{repo_type}s--"):]
            model_id = object_id.replace("--", "/")
            models.append(model_id)
    return models

def sd_generate(prompt, image=None, mask=None, negative='', steps=20, guidance=7.5, noise=.8, batch_size=1):
    print(f'generate ({model_id}) {prompt}')
    
    if device == 'cpu':
        pipe = BasePipeline.from_pretrained(
            'runwayml/stable-diffusion-v1-5',
        )
    else:
        pipe = BasePipeline.from_pretrained(
            'runwayml/stable-diffusion-v1-5',
            torch_dtype=torch.float16,
            revision="fp16",
        )
        pipe.enable_xformers_memory_efficient_attention()

    pipe = pipe.to(device)
    
    images = pipe(prompt=prompt, image=image, mask=mask, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative, strength=noise, batch_size=batch_size)
    
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
    