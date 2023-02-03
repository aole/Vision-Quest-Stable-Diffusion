# basepipeline.py

from typing import Optional

import torch
import numpy as np
from diffusers import DiffusionPipeline
from PIL import Image


class BasePipeline(DiffusionPipeline):
    def __init__(self, vae, text_encoder, tokenizer, unet, scheduler):
        super().__init__()

        self.register_modules(vae=vae, text_encoder=text_encoder, tokenizer=tokenizer, unet=unet, scheduler=scheduler)
        self.vae_scale_factor = 2 ** (len(self.vae.config.block_out_channels) - 1)

    def latents_to_images(self, latents):
        latents = 1 / 0.18215 * latents
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
        
    def encode_prompt(self, prompt, negative_prompt):
        # encode prompt
        text_inputs = self.tokenizer(
            prompt,
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
        
        # classifier free guidance
        uncond_tokens = [negative_prompt]
        
        max_length = text_input_ids.shape[-1]
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

        # For classifier free guidance, we need to do two forward passes.
        # Here we concatenate the unconditional and text embeddings into a single batch
        # to avoid doing two forward passes
        return torch.cat([uncond_embeddings, text_embeddings])

    @torch.no_grad()
    def __call__(
        self,
        prompt,
        height: Optional[int] = None,
        width: Optional[int] = None,
        batch_size: Optional[int] = 1,
        num_inference_steps: Optional[int] = 50,
        guidance_scale=7.5,
        negative_prompt=''
    ):
        text_embeddings = self.encode_prompt(prompt, negative_prompt)
        
        # Default height and width to unet
        height = height or self.unet.config.sample_size * self.vae_scale_factor
        width = width or self.unet.config.sample_size * self.vae_scale_factor
        
        #prepare latents
        shape = (batch_size, self.unet.in_channels, height // self.vae_scale_factor, width // self.vae_scale_factor)
        
        # Sample gaussian noise to begin loop
        # generator = torch.Generator(self.device).manual_seed(44444)
        
        # latents = torch.randn(shape, generator=generator, device=self.device)
        latents = torch.randn(shape, device=self.device, dtype=text_embeddings.dtype)

        # set step values
        self.scheduler.set_timesteps(num_inference_steps)

        with self.progress_bar(total=num_inference_steps) as progress_bar:
            for i, t in enumerate(self.scheduler.timesteps):
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
        