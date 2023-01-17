import numpy as np
from PIL import Image, ImageDraw
from stable_diffusion import sd_inpainting

# open the original image
im = Image.open('image.png')

# Create a draw object
draw = ImageDraw.Draw(im)
# Draw the rectangle with gradient color
for i in range(300):
    draw.rectangle([(70, 50+i), (80, i+51)], fill=(200, 60, 50))

im.save('image_1.png')

mk = Image.new("RGBA", (im.width, im.height), (0,0,0,255))

# Create a draw object
draw = ImageDraw.Draw(mk)
# Define the gradient colors
white = (255, 255, 255)
black = (0, 0, 0)

# Draw the rectangle with gradient color
draw.rectangle([(50, 50), (100, 450)], fill=white)

mk.save('image_2.png')

outimgs = sd_inpainting(im, mk, "mona lisa painting", steps=30, batch_size=9)
for i, sd in enumerate(outimgs):
    sd[0].save(f'image_3_{i+1}.png')

'''
'''
