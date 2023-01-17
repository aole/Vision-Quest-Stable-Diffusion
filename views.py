from flask import Blueprint, request, render_template, Response, jsonify
from stable_diffusion import sd_txt2img, sd_img2img, sd_inpainting, sd_get_model_id, sd_change_model
import time, base64
from PIL import Image
from io import BytesIO
import numpy as np


views = Blueprint(__name__, "views")

start_from_no_image = True


@views.route("/")
def index():
  cache_busting_param = str(time.time())
  return render_template('index.html', model_id=sd_get_model_id(), cache_busting_param=cache_busting_param)


@views.route('/txt2img', methods=['POST'])
def txt2img():
  prompt = request.form.get('prompt')
  negative = request.form.get('negative')
  num_steps = int(request.form.get('numSteps'))
  guidance = float(request.form.get('guidance'))
  
  outimg = sd_txt2img(prompt, negative, num_steps, guidance);
  outimg[0].save('static/images/image.png')
  
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
  
  outimg = sd_img2img(img, prompt, negative, num_steps, guidance, noise);
  outimg[0].save('static/images/image.png')
  
  return jsonify({'image':'/static/images/image.png?v=' + str(time.time())})

@views.route('/inpainting', methods=['POST'])
def inpainting():
  prompt = request.form.get('prompt')
  negative = request.form.get('negative')
  num_steps = int(request.form.get('numSteps'))
  guidance = float(request.form.get('guidance'))
  noise = float(request.form.get('noise'))/100 # converting user scale of 0-100 to model scale of 0-1.
  _, img_data = request.form.get('image').split(',')
  _, mask_data = request.form.get('mask').split(',')
  
  img = Image.open(BytesIO(base64.b64decode(img_data))).convert("RGB")
  mask = Image.open(BytesIO(base64.b64decode(mask_data)))
  npimg = np.array(mask)
  trans_mask = (npimg[:,:,3] == 0)
  npimg[trans_mask] = [0, 0, 0, 255]
  npimg[np.logical_not(trans_mask)] = [0,0,0,0]
  pastemask = Image.fromarray(npimg)
  
  mask = mask.convert("RGB")
  outimg = sd_inpainting(img, mask, prompt, negative, num_steps, guidance, noise)
  outimg = next(outimg)[0]
  outimg.paste(img, (0,0), pastemask)
  
  outimg.save('static/images/image.png')
  
  return jsonify({'image':'/static/images/image.png?v=' + str(time.time())})

@views.route('/change_model', methods=['POST'])
def change_model():
  mid = request.form.get('model_id')
  mid = sd_change_model(mid)
  return jsonify({'model_id':mid})
