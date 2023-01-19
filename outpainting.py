import numpy as np
from PIL import Image
from stable_diffusion import sd_inpainting

# render box position wrt image
startx = -256
starty = 0
width = 512
height = 512

# open the original image
im = Image.open('image_0.png')

# create placeholder image with transparent section
w = max(width - startx, im.width) if startx<0 else max(width+startx, im.width)
h = max(height - starty, im.height) if starty<0 else max(height+starty, im.height)
pl = Image.new("RGBA", (w, h), (0,0,0,0))
pl.paste(im, (max(0, startx), max(0, starty)))
pl.save('image_1.png')

# crop the image to the intersetion of the render window
cr = im.crop((max(0, -startx), max(0, -starty), min(width+max(0, -startx), im.width), min(height+max(0, -starty), im.height)))
cr.save('image_2.png')

# create renderable transparent input image and paste the cropped image
rn = Image.new("RGBA", (width, height), (0,0,0,0))
rn.paste(cr, (max(0, startx), max(0, starty)))
rn.save('image_3.png')

# create mask from the input image
im_np = np.array(rn)
alpha = im_np[:, :, 3]
bw = np.zeros(alpha.shape + (3,), dtype=np.uint8)
bw[alpha == 0] = (255, 255, 255)
bw[alpha > 0] = (0, 0, 0)
mk = Image.fromarray(bw)
mk.save('image_4.png')

outimgs = sd_inpainting(cr, mk, "mona lisa painting", steps=30, batch_size=9)
for i, sd in enumerate(outimgs):
    sd[0].save(f'image_5_{i+1}.png')
    fl = Image.new("RGBA", (pl.width, pl.height), (0,0,0,0))
    fl.paste(sd[0], (max(0, -startx), max(0, -starty)))
    fl.paste(pl, (0, 0), mask=pl)
    fl.save(f'image_6_{i+1}.png')

'''
'''
