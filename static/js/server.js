// server.js

var cacheBustingParam = Date.now();

function generate() {
	const prompt_ = document.getElementById('prompt').value;
	const negative = document.getElementById('negative').value;
	const numSteps = document.getElementById('steps-slider').value;
	const guidance = document.getElementById('guidance-slider').value;
	const batch_size = document.getElementById('batch-slider').value;

	var formData = new FormData();

	formData.append('prompt', prompt_);
	formData.append('negative', negative);
	formData.append('width', renderBoxWidth);
	formData.append('height', renderBoxHeight);
	formData.append('numSteps', numSteps);
	formData.append('guidance', guidance);
	formData.append('batch_size', batch_size);

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
		mode = 'outpainting';
		var img = cimg[1];
		var mask = cimg[2];
		
		formData.append('image', img);
		formData.append('mask', mask);
	}

    var xhr = new XMLHttpRequest();
    xhr.open("POST", mode, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
		var res = JSON.parse(xhr.response)
		var batch_size = res.count;
        var urls = res.urls;
        imagesRendered(urls, batch_size);
      } else {
        console.error('Error:', xhr);
      }
    };
    xhr.send(formData);
}

function addNewModel() {
    msgbox('test');
}

function addModelToList(model_id) {
  let datalist = document.getElementById("models-list");

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
  
  document.getElementById('models-list').value = model_id;
}

function changeModel() {
    var model_id = document.getElementById('models-list').value;
	
	// TODO
    document.getElementById('models-list').value = 'please wait ...';

    var formData = new FormData();

    formData.append('model_id', model_id);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", 'change_model', true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            model_id = JSON.parse(xhr.response).model_id;
            document.getElementById('models-list').value = model_id;
        } else {
            console.error('Error:', xhr);
        }
    };
    xhr.send(formData);
}

function changeScheduler() {
    var scheduler = document.getElementById('scheduler-list').value;
	
    var formData = new FormData();

    formData.append('scheduler', scheduler);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", 'change_scheduler', true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            scheduler = JSON.parse(xhr.response).scheduler;
            document.getElementById('scheduler-list').value = scheduler;
        } else {
            console.error('Error:', xhr);
        }
    };
    xhr.send(formData);
}
