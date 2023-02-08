from PIL import Image, ImageDraw, ImageFilter
import torch
import numpy

img = Image.new('RGB', (128,128), 0)
img.save('temp01.png')

draw = ImageDraw.Draw(img)
draw.rectangle((108, 0, 128, 128), fill=(255,255,255))
img.save('temp02.png')

img = img.filter(ImageFilter.MaxFilter(3))
img.save('temp03.png')
