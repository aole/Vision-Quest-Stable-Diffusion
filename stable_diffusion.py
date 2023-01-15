# stable_diffusion.py

from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline, StableDiffusionInpaintPipeline, StableDiffusionInpaintPipelineLegacy
import torch
import tempfile
import torch

imgfile = 'static/images/image.png'
    
model_id = "runwayml/stable-diffusion-v1-5"
# model_id = "CompVis/stable-diffusion-v1-4"

device = "cuda"

def sd_txt2img(prompt, negative='', steps=20, guidance=7.5):
    print(f'txt2img ({model_id}) {prompt}')
    pipe = StableDiffusionPipeline.from_pretrained(model_id, safety_checker=None)
    pipe = pipe.to(device)
    image = pipe(prompt=prompt, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative).images[0]
    
    image.save(imgfile)

def sd_img2img(image, prompt, negative='', steps=20, guidance=7.5, noise=.8):
    print(f'img2img ({model_id}) {prompt}')
    pipe = StableDiffusionImg2ImgPipeline.from_pretrained(model_id, safety_checker=None)
    pipe = pipe.to(device)
    image = pipe(prompt=prompt, strength=noise, image=image, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative).images[0]
    
    image.save(imgfile)

def sd_inpainting(image, mask, prompt, negative='', steps=20, guidance=7.5, noise=.8):
    print(f'inpainting ({model_id}) {prompt}')
    # pipe = StableDiffusionInpaintPipeline.from_pretrained("runwayml/stable-diffusion-inpainting", safety_checker=None)
    pipe = StableDiffusionInpaintPipelineLegacy.from_pretrained(model_id, safety_checker=None)
    pipe = pipe.to(device)
    image = pipe(prompt=prompt, strength=noise, image=image, mask_image=mask, num_inference_steps=steps, guidance_scale=guidance, negative_prompt=negative).images[0]
    
    image.save(imgfile)

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
    