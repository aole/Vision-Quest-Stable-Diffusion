from flask import Flask, request, render_template, Response
import time

from stable_diffusion import generate_image

PORT = 4444

app = Flask(__name__)

@app.route('/generate', methods=['POST'])
def generate():
  text = request.form['prompt']
  steps = int(request.form['steps'])
  use_gpu = request.form['usegpu'] == 'true'
  '''
  def generate_updates():
    for update in generate_image(text, steps):
      yield str(update) + '\n'
      yield '/static/images/image.png?v=' + str(time.time())
  '''
  # return Response(generate_updates(), mimetype='text/plain')
  generate_image(text, steps, use_gpu)
  
  # return Response(generate_image(text, steps), mimetype='text/plain')
  return Response('/static/images/image.png?v=' + str(time.time()), mimetype='text/plain')

@app.route('/')
def index():
  cache_busting_param = str(time.time())
  return render_template('index.html', cache_busting_param=cache_busting_param)

if __name__ == '__main__':
  app.run(port=PORT)
