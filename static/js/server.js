// server.js

var cacheBustingParam = Date.now();

function generate() {
	const prompt_ = document.getElementById('prompt').value;
	const negative = document.getElementById('negative').value;
	const numSteps = document.getElementById('steps-slider').value;
	const guidance = document.getElementById('guidance-slider').value;

	var formData = new FormData();

	formData.append('prompt', prompt_);
	formData.append('negative', negative);
	formData.append('numSteps', numSteps);
	formData.append('guidance', guidance);

	var mode = 'txt2img';
    var cimg = generateModelImage();
	if (cimg[0]==='ALLOPAQUE'){
		var img = cimg[1];
		mode = 'img2img';
		formData.append('image', img);
	
		var mask = generateMaskImage();
		if (mask!=0) {
			mode = 'inpainting';
			formData.append('mask', mask);
		}
		
		const noise = document.getElementById('noise-slider').value;
		formData.append('noise', noise);
	} else if (cimg[0]==='SOMETRANS') {
		mode = 'inpainting';
		var img = cimg[1];
		var mask = cimg[2];
		
		formData.append('image', img);
		formData.append('mask', mask);
		formData.append('noise', '100');
	}

    var xhr = new XMLHttpRequest();
    xhr.open("POST", mode, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        var url = JSON.parse(xhr.response).image + '?v=' + cacheBustingParam;
        updateRenderImage(url);
      } else {
        console.error('Error:', xhr);
      }
    };
    xhr.send(formData);
}

function addModelToList(model_id) {
  let datalist = document.getElementById("model-ids");

  // check if the option already exists
  let options = datalist.options;
  let optionExists = false;
  for (let i = 0; i < options.length; i++) {
    if (options[i].value === model_id) {
      optionExists = true;
      break;
    }
  }

  // if the option does not exist, create it and append to the datalist
  if (!optionExists) {
    let newOption = document.createElement("option");
    newOption.value = model_id;
    datalist.appendChild(newOption);
  }
  
  document.getElementById('model-id-input').value = model_id;
}

function changeModel() {
  var model_id = document.getElementById('model-id-input').value;
  document.getElementById('model-id-input').value = 'please wait ...';
  
  var formData = new FormData();
  
  formData.append('model_id', model_id);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", 'change_model', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        model_id = JSON.parse(xhr.response).model_id;
        addModelToList(model_id);
      } else {
        console.error('Error:', xhr);
      }
    };
    xhr.send(formData);
}
