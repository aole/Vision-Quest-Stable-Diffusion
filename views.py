from flask import Blueprint, request, render_template, Response, jsonify
from stable_diffusion import sd_txt2img
import time, base64
from PIL import Image
from io import BytesIO


views = Blueprint(__name__, "views")

start_from_no_image = True


@views.route("/")
def index():
  cache_busting_param = str(time.time())
  return render_template('index.html', cache_busting_param=cache_busting_param)


@views.route('/txt2img', methods=['POST'])
def txt2img():
  prompt = request.json.get('prompt')
  negative = request.json.get('negative')
  num_steps = int(request.json.get('numSteps'))
  
  sd_txt2img(prompt, negative, num_steps);
  
  return jsonify({'image':'/static/images/image.png?v=' + str(time.time())})


@views.route('/generate/<steps>', methods=['POST'])
def generate(steps):
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
