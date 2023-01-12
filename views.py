from flask import Blueprint, request, render_template, Response, jsonify
from stable_diffusion import sd_txt2img, sd_img2img
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
  prompt = request.form.get('prompt')
  negative = request.form.get('negative')
  num_steps = int(request.form.get('numSteps'))
  guidance = float(request.form.get('guidance'))
  
  sd_txt2img(prompt, negative, num_steps, guidance);
  
  return jsonify({'image':'/static/images/image.png?v=' + str(time.time())})

@views.route('/img2img', methods=['POST'])
def img2img():
  prompt = request.form.get('prompt')
  negative = request.form.get('negative')
  num_steps = int(request.form.get('numSteps'))
  guidance = float(request.form.get('guidance'))
  noise = float(request.form.get('noise'))/100
  _, img_data = request.form.get('image').split(',')
  
  img = Image.open(BytesIO(base64.b64decode(img_data))).convert("RGB")
  sd_img2img(img, prompt, negative, num_steps, guidance, noise);
  
  return jsonify({'image':'/static/images/image.png?v=' + str(time.time())})
