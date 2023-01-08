from flask import Flask, request, render_template, Response
import time, base64
from PIL import Image
from io import BytesIO

from stable_diffusion import generate_image

PORT = 4444

start_from_no_image = True

app = Flask(__name__)

@app.route('/generate', methods=['POST'])
def generate():
  global start_from_no_image
  
  text = request.form['prompt']
  steps = int(request.form['steps'])
  use_gpu = request.form['usegpu'].lower() == 'true'
  use_mask = request.form['usemask'].lower() == 'true'
  
  if start_from_no_image:
    print('Text to Image')
    generate_image(text, None, None, steps, use_gpu)
    start_from_no_image = False
  elif not use_mask:
    print('Image to Image')
    _, img_data = request.form['image'].split(',')  # base64-encoded image data
    img = Image.open(BytesIO(base64.b64decode(img_data))).convert("RGB")
    generate_image(text, img, None, steps, use_gpu)
  elif use_mask:
    print('Inpainting')
    _, img_data = request.form['image'].split(',')  # base64-encoded image data
    img = Image.open(BytesIO(base64.b64decode(img_data))).convert("RGB")
    _, msk_data = request.form['mask'].split(',')  # base64-encoded image data
    msk = Image.open(BytesIO(base64.b64decode(msk_data))).convert("RGB")
    msk.save('mskRGB.jpg')
    generate_image(text, img, msk, steps, use_gpu)
  
  # return Response(generate_image(text, steps), mimetype='text/plain')
  return Response('/static/images/image.png?v=' + str(time.time()), mimetype='text/plain')

@app.route('/')
def index():
  cache_busting_param = str(time.time())
  return render_template('index.html', cache_busting_param=cache_busting_param)

if __name__ == '__main__':
  app.run(port=PORT)
