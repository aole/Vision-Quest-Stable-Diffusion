# stable_diffusion.py

from diffusers import DiffusionPipeline, StableDiffusionPipeline, StableDiffusionImg2ImgPipeline, StableDiffusionInpaintPipeline, StableDiffusionInpaintPipelineLegacy
import diffusers as df
from diffusers import DDIMScheduler
import torch
import tempfile, os

cache_dir = df.utils.DIFFUSERS_CACHE
repo_type = "model"

model_id = "runwayml/stable-diffusion-v1-5"
# model_id = "CompVis/stable-diffusion-v1-4"

device = "cuda" if torch.cuda.is_available() else 'cpu'

def sd_get_cached_models_list():
    models = []

    for repo_cache in os.listdir(cache_dir):
        if os.path.isdir(os.path.join(cache_dir, repo_cache)):
            object_id = repo_cache[len(f"{repo_type}s--"):]
            model_id = object_id.replace("--", "/")
            models.append(model_id)
    return models

'''
def sd_txt2img(prompt, negative='', steps=20, guidance=7.5):
    print(f'txt2img ({model_id}) {prompt}')
    pipe = StableDiffusionPipeline.from_pretrained(model_id, safety_checker=None)
    pipe = pipe.to(device)
    image = pipe(prompt=prompt, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative).images[0]
    
    image.save(imgfile)
'''
def sd_txt2img(prompt, negative='', steps=20, guidance=7.5):
    print(f'custom pipeline ({model_id}) {prompt}')
    pipe = DiffusionPipeline.from_pretrained(
        model_id,
        custom_pipeline="./pipelines/txt2img",
    
        # torch_dtype=torch.float16,
    )
    pipe = pipe.to(device)
    images = pipe(prompt=prompt, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative)
    
    return images

def sd_img2img(image, prompt, negative='', steps=20, guidance=7.5, noise=.8):
    print(f'img2img ({model_id}) {prompt}. Steps: {steps}', flush=True)
    # pipe = StableDiffusionImg2ImgPipeline.from_pretrained(model_id, safety_checker=None)
    pipe = DiffusionPipeline.from_pretrained(
        model_id,
        custom_pipeline="./pipelines/img2img",
    
        # torch_dtype=torch.float16,
    )
    pipe = pipe.to(device)
    images = pipe(prompt=prompt, strength=noise, image=image, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative)
    
    return images

def sd_inpainting(image, mask, prompt, negative='', steps=20, guidance=7.5, noise=.8, batch_size=1):
    print(f'inpainting ({model_id}) {prompt}')
    pipe = StableDiffusionInpaintPipeline.from_pretrained("runwayml/stable-diffusion-inpainting", safety_checker=None)
    #ddim = DDIMScheduler.from_pretrained(model_id, subfolder="scheduler")
    #pipe = StableDiffusionInpaintPipelineLegacy.from_pretrained(model_id, scheduler=ddim, safety_checker=None)
    pipe = pipe.to(device)
    
    for i in range(batch_size):
        images = pipe(prompt=prompt, image=image, mask_image=mask, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative).images
        yield images
    # image = pipe(prompt=prompt, strength=noise, image=image, mask_image=mask, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative).images[0]
    
def sd_get_model_id():
    return model_id
    
def sd_change_model(mid):
    global model_id
    try:
        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(mid, safety_checker=None)
        model_id = mid
        print('Success changing model to', mid)
    except:
        print('Error changing model to', mid)
        
    return model_id
    