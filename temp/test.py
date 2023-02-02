from pipelines.basepipeline import BasePipeline


pipe = BasePipeline.from_pretrained('runwayml/stable-diffusion-v1-5',)
pipe = pipe.to('cpu')

images = pipe(
    prompt='Chef playing tennis',
    num_inference_steps=3,
    guidance_scale=7.5
)

images[0].save('temp/test.png')
