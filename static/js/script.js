window.onload = function() {
	var img = new Image();
	img.src = '/static/images/image.png';
	var ctx = document.getElementById('canvas').getContext('2d');
	img.onload = function() {
		ctx.drawImage(img, 0, 0);
	}
};

document.getElementById('form').addEventListener('submit', function(event) {
  event.preventDefault();
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/generate');
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.onload = function() {
    if (xhr.status === 200) {
        // var progress = xhr.responseText;
        // document.getElementById('progress').value = progress;
        // var image = new Image();
        // image.src = xhr.responseText;
        // document.getElementById('image').src = image.src;
        // document.getElementById('image').src = xhr.responseText;
        var img = new Image();
        img.src = xhr.responseText;
        var ctx = document.getElementById('canvas').getContext('2d');
		img.onload = function() {
			ctx.drawImage(img, 0, 0);
		}
    }
  };
  xhr.send('prompt=' + encodeURIComponent(document.getElementsByName('prompt')[0].value)
    + '&steps=' + encodeURIComponent(document.getElementsByName('steps')[0].value)
	+ '&usegpu=' + encodeURIComponent(document.getElementsByName('use-gpu')[0].checked));
});

document.getElementsByName('steps')[0].addEventListener('input', function(event) {
  document.getElementById('steps-value').innerHTML = event.target.value;
});
