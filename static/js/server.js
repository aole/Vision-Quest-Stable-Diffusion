// server.js

function generate() {
	const numSteps = document.getElementById('slider-steps').value;
	const prompt_ = document.getElementById('prompt').value;
	const negative = document.getElementById('negative').value;
	
	console.log(numSteps, prompt_, negative);
	
	fetch('/txt2img', {
		method: 'POST',
		body: JSON.stringify({prompt: prompt_, negative: negative, numSteps: numSteps}),
		headers:{
		  'Content-Type': 'application/json'
		}
	})
	.then(response => response.json())
	.then(data => {
		console.log(data.image);
	});
}
