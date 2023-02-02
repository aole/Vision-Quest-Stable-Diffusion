from flask import Flask
from views import views

PORT = 4444

app = Flask(__name__)
app.register_blueprint(views, url_prefix="/")
