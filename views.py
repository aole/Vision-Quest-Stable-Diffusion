from flask import Blueprint, request, render_template, Response, jsonify
from stable_diffusion import sd_generate, sd_generate_out, sd_get_model_id, sd_change_model, sd_get_cached_models_list
import time, base64
from PIL import Image, ImageFilter
from io import BytesIO
import numpy as np
import datetime


views = Blueprint(__name__, "views")

start_from_no_image = True


@views.route("/")
def index():
    cache_busting_param = str(time.time())
    model_sel=sd_get_model_id()
    models=sd_get_cached_models_list()
    
    return render_template('index.html', model_sel=model_sel, models=models, cache_busting_param=cache_busting_param)

@views.route('/test', methods=['POST'])
def testfn():
    w = int(request.form.get('width'))
    h = int(request.form.get('height'))
    mask_data = request.form.get('mask').split(',')
    a = np.asarray(mask_data).astype('byte').reshape(-1)
    image = Image.frombuffer('RGBA', (w, h), a)
    image.save('out_mask.png')

    return 'Success!'

def save_renders(images, orig=None, mask=None):
    print(f'Num images generated: {len(images)}', flush=True)
    
    current_time = datetime.datetime.now()
    files = []
    for i, image in enumerate(images):
        name = 'static/images/tmp'+current_time.strftime("%Y%m%d_%H%M%S")+str(i)+'.png'
        files.append(name)
        
        if orig and mask: image.paste(orig, (0, 0), mask)
        image.save(name)
    
    return files

@views.route('/txt2img', methods=['POST'])
def txt2img():
    prompt = request.form.get('prompt')
    negative = request.form.get('negative')
    num_steps = int(request.form.get('numSteps'))
    guidance = float(request.form.get('guidance'))
    batch_size = int(request.form.get('batch_size'))

    images = sd_generate(prompt=prompt, negative=negative, steps=num_steps, guidance=guidance, batch_size=batch_size);
    files = save_renders(images)
    
    return jsonify({'urls':files, 'count': len(files)})

@views.route('/img2img', methods=['POST'])
def img2img():
    prompt = request.form.get('prompt')
    negative = request.form.get('negative')
    num_steps = int(request.form.get('numSteps'))
    guidance = float(request.form.get('guidance'))
    batch_size = int(request.form.get('batch_size'))
    noise = float(request.form.get('noise'))/100
    _, img_data = request.form.get('image').split(',')

    img = Image.open(BytesIO(base64.b64decode(img_data))).convert("RGB")

    images = sd_generate(image=img, prompt=prompt, negative=negative, steps=num_steps, guidance=guidance, noise=noise, batch_size=batch_size)
    files = save_renders(images)
    
    return jsonify({'urls':files, 'count': len(files)})

@views.route('/inpainting', methods=['POST'])
def inpainting():
    prompt = request.form.get('prompt')
    negative = request.form.get('negative')
    num_steps = int(request.form.get('numSteps'))
    guidance = float(request.form.get('guidance'))
    batch_size = int(request.form.get('batch_size'))
    noise = float(request.form.get('noise'))/100 # converting user scale of 0-100 to model scale of 0-1.
    _, img_data = request.form.get('image').split(',')
    _, mask_data = request.form.get('mask').split(',')

    orig = Image.open(BytesIO(base64.b64decode(img_data))).convert("RGB")
    mask = Image.open(BytesIO(base64.b64decode(mask_data)))

    mask = mask.filter(ImageFilter.MaxFilter(9))

    npimg = np.array(mask)
    trans_mask = (npimg[:,:,3] == 0)
    npimg[trans_mask] = [0, 0, 0, 255]
    npimg[np.logical_not(trans_mask)] = [0,0,0,0]
    pastemask = Image.fromarray(npimg)
    pastemask = pastemask.filter(ImageFilter.BoxBlur(2))

    mask = mask.convert("RGB")
    images = sd_generate(image=orig, mask=mask, prompt=prompt, negative=negative, steps=num_steps, guidance=guidance, noise=noise, batch_size=batch_size)
    files = save_renders(images, orig, pastemask)
    
    return jsonify({'urls':files, 'count': len(files)})

@views.route('/outpainting', methods=['POST'])
def outpainting():
    prompt = request.form.get('prompt')
    negative = request.form.get('negative')
    num_steps = int(request.form.get('numSteps'))
    guidance = float(request.form.get('guidance'))
    batch_size = int(request.form.get('batch_size'))
    _, img_data = request.form.get('image').split(',')
    _, mask_data = request.form.get('mask').split(',')

    orig = Image.open(BytesIO(base64.b64decode(img_data)))
    mask = Image.open(BytesIO(base64.b64decode(mask_data)))

    mask = mask.filter(ImageFilter.MaxFilter(9))

    npimg = np.array(mask)
    trans_mask = (npimg[:,:,3] == 0)
    npimg[trans_mask] = [0, 0, 0, 255]
    npimg[np.logical_not(trans_mask)] = [0,0,0,0]
    pastemask = Image.fromarray(npimg)
    pastemask = pastemask.filter(ImageFilter.BoxBlur(2))

    mask = mask.convert("RGB")
    images = sd_generate_out(image=orig.convert("RGB"), mask=mask, prompt=prompt, negative=negative, steps=num_steps, guidance=guidance, batch_size=batch_size)
    files = save_renders(images, orig, pastemask)
    
    return jsonify({'urls':files, 'count': len(files)})

@views.route('/change_model', methods=['POST'])
def change_model():
    mid = request.form.get('model_id')
    mid = sd_change_model(mid)
    
    return jsonify({'model_id':mid})

@views.route('/save_image', methods=['POST'])
def save_image():
    _, img_data = request.form.get('image').split(',')
    image = Image.open(BytesIO(base64.b64decode(img_data)))

    current_time = datetime.datetime.now()
    image.save('static/saves/image'+current_time.strftime("%Y%m%d_%H%M%S")+'.png')

    return 'Success'
