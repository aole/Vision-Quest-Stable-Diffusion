# basepipeline.py

from typing import Optional

import torch
import numpy as np
from diffusers import DiffusionPipeline
from PIL import Image
from accelerate import cpu_offload

def preprocess(image, width, height):
    if isinstance(image, torch.Tensor):
        return image
    elif isinstance(image, Image.Image):
        image = [image]

    if isinstance(image[0], Image.Image):
        # w, h = image[0].size
        w, h = width, height
        # w, h = map(lambda x: x - x % 8, (w, h))  # resize to integer multiple of 8

        image = [np.array(i.resize((w, h), resample=Image.Resampling.LANCZOS))[None, :] for i in image]
        image = np.concatenate(image, axis=0)
        image = np.array(image).astype(np.float16) / 255.0
        image = image.transpose(0, 3, 1, 2)
        image = 2.0 * image - 1.0
        image = torch.from_numpy(image)
    elif isinstance(image[0], torch.Tensor):
        image = torch.cat(image, dim=0)
    return image

class BasePipeline(DiffusionPipeline):
    def __init__(self, vae, text_encoder, tokenizer, unet, scheduler):
        super().__init__()

        self.register_modules(vae=vae, text_encoder=text_encoder, tokenizer=tokenizer, unet=unet, scheduler=scheduler)
        self.vae_scale_factor = 2 ** (len(self.vae.config.block_out_channels) - 1)

    def latents_to_images(self, latents):
        latents = 1 / 0.18215 * latents
        # latents = 1 / self.vae_scale_factor * latents
        # latents = 1 / self.vae.config.scaling_factor * latents
        image = self.vae.decode(latents).sample
        image = (image / 2 + 0.5).clamp(0, 1)
        # we always cast to float32 as this does not cause significant overhead and is compatible with bfloa16
        images = image.cpu().permute(0, 2, 3, 1).float().numpy()
        
        if images.ndim == 3:
            images = images[None, ...]
        images = (images * 255).round().astype("uint8")
        
        pil_images = [Image.fromarray(image) for image in images]
        
        return pil_images
    
    def save_latents(self, t, latents):
        images = self.latents_to_images(latents)
        for i, image in enumerate(images):
            image.save(f'./temp/{t}_latent_{i}.jpg')
        
    def encode_prompt(self, prompt, negative_prompt, batch_size=1):
        # encode prompt
        text_inputs = self.tokenizer(
            [prompt]*batch_size,
            padding="max_length",
            max_length=self.tokenizer.model_max_length,
            truncation=True,
            return_tensors="pt",
        )
        text_input_ids = text_inputs.input_ids
        
        text_embeddings = self.text_encoder(
            text_input_ids.to(self.device),
            attention_mask=None,
        )
        text_embeddings = text_embeddings[0]
        
        text_embeddings = text_embeddings.to(dtype=self.text_encoder.dtype, device=self.device)
        bs_embed, seq_len, _ = text_embeddings.shape
        text_embeddings = text_embeddings.repeat(1, 1, 1)
        text_embeddings = text_embeddings.view(bs_embed, seq_len, -1)
        
        # negative prompt
        uncond_tokens = [negative_prompt] * batch_size
        
        max_length = text_input_ids.shape[1]
        uncond_input = self.tokenizer(
            uncond_tokens,
            padding="max_length",
            max_length=max_length,
            truncation=True,
            return_tensors="pt",
        )

        uncond_embeddings = self.text_encoder(
            uncond_input.input_ids.to(self.device),
            attention_mask=None,
        )
        uncond_embeddings = uncond_embeddings[0]

        seq_len = uncond_embeddings.shape[1]
        uncond_embeddings = uncond_embeddings.to(dtype=self.text_encoder.dtype, device=self.device)
        uncond_embeddings = uncond_embeddings.repeat(1, 1, 1)
        uncond_embeddings = uncond_embeddings.view(batch_size, seq_len, -1)
        
        # For classifier free guidance, we need to do two forward passes.
        # Here we concatenate the unconditional and text embeddings into a single batch
        # to avoid doing two forward passes
        return torch.cat([uncond_embeddings, text_embeddings])

    def enable_vae_slicing(self):
        self.vae.enable_slicing()
        
    def enable_sequential_cpu_offload(self, gpu_id=0):
        dv = torch.device(f"cuda:{0}")

        for cpu_offloaded_model in [self.unet, self.text_encoder, self.vae]:
            cpu_offload(cpu_offloaded_model, dv)
        
    def get_timesteps(self, num_inference_steps, strength, device):
        # get the original timestep using init_timestep
        init_timestep = min(int(num_inference_steps * strength), num_inference_steps)

        t_start = max(num_inference_steps - init_timestep, 0)
        timesteps = self.scheduler.timesteps[t_start:]

        return timesteps, num_inference_steps - t_start

    @torch.no_grad()
    def __call__(
        self,
        prompt,
        height: Optional[int] = None,
        width: Optional[int] = None,
        image: Optional[Image.Image] = None,
        strength: Optional[float] = 0.75,
        batch_size: Optional[int] = 1,
        num_inference_steps: Optional[int] = 50,
        guidance_scale: Optional[float] = 7.5,
        negative_prompt: Optional[str] = ''
    ):
        # Default height and width to unet
        height = height or self.unet.config.sample_size * self.vae_scale_factor
        width = width or self.unet.config.sample_size * self.vae_scale_factor
        
        text_embeddings = self.encode_prompt(prompt, negative_prompt, batch_size)
        dtype = text_embeddings.dtype
        
        # if image 2 image
        if image:
            image = preprocess(image, width, height)
        else:
            strength = 1.0
        
        # scheduler
        self.scheduler.set_timesteps(num_inference_steps, device=self.device)
        timesteps, num_inference_steps = self.get_timesteps(num_inference_steps, strength, self.device)
        latent_timestep = timesteps[:1].repeat(batch_size)
        
        #prepare latents
        shape = (batch_size, self.unet.in_channels, height // self.vae_scale_factor, width // self.vae_scale_factor)
        
        # Sample gaussian noise to begin loop
        # generator = torch.Generator(self.device).manual_seed(44444)
        
        # noise = torch.randn(shape, generator=generator, device=self.device, dtype=dtype)
        noise = torch.randn(shape, device=self.device, dtype=dtype)

        if image is not None:
            image = image.to(device=self.device, dtype=dtype)
            img_latents = self.vae.encode(image).latent_dist.sample()
            # img_latents = self.vae_scale_factor * img_latents
            # img_latents = self.vae.scaling_factor * img_latents
            img_latents = 0.18215 * img_latents
            img_latents = torch.cat([img_latents], dim=0)
            shape = img_latents.shape
            
            latents = self.scheduler.add_noise(img_latents, noise, latent_timestep)
        else:
            latents = noise
            
        with self.progress_bar(total=num_inference_steps) as progress_bar:
            for i, t in enumerate(timesteps):
                # self.save_latents(i, latents)
                latent_model_input = torch.cat([latents] * 2)
                latent_model_input = self.scheduler.scale_model_input(latent_model_input, t)
                
                # 1. predict noise model_output
                noise_pred = self.unet(latent_model_input, t, encoder_hidden_states=text_embeddings).sample

                # perform guidance
                noise_pred_uncond, noise_pred_text = noise_pred.chunk(2)
                noise_pred = noise_pred_uncond + guidance_scale * (noise_pred_text - noise_pred_uncond)

                # 2. predict previous mean of image x_t-1 and add variance depending on eta
                # eta corresponds to η in paper and should be between [0, 1]
                # do x_t -> x_t-1
                latents = self.scheduler.step(noise_pred, t, latents).prev_sample
                
                progress_bar.update()

        return self.latents_to_images(latents)
        