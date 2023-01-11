// server.js

var cacheBustingParam = Date.now();

function generate() {
	const numSteps = document.getElementById('steps-slider').value;
	const prompt_ = document.getElementById('prompt').value;
	const negative = document.getElementById('negative').value;
	
	var mode = 'txt2img';
	
	fetch(mode, {
		method: 'POST',
		body: JSON.stringify({prompt: prompt_, negative: negative, numSteps: numSteps}),
		headers:{
		  'Content-Type': 'application/json'
		}
	})
	.then(response => response.json())
	.then(data => {
		var url = data.image+'?v=' + cacheBustingParam;
		updateRenderImage(url);
	});
}
