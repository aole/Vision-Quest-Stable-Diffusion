
var cacheBustingParam = Date.now();

var spacebarDown = false;

var renderBoxWidth = 512;
var renderBoxHeight = 512;

let scale = 1.0;
let handleRadius = 10;
let handleRadius2 = handleRadius*handleRadius;
let pickRadius = 5;

let handleMouse = 0; // 0: None, 1: Top, 2: Right, 3: Bottom, 4: Left
let pickMouse = 0;

let boundsLineWidth = 1;
let boundsLineWidthHighligh = 3;

var brushColor = '#000';
var maskColor = '#F99';

var currentPath;
var maskPath;

// Get parent element
var parent = document.getElementById("canvas-container");

// Get canvas element
var viewport = document.getElementById("visCanvas");

// Set canvas dimensions to match parent element
viewport.width = parent.offsetWidth-25; // padding
viewport.height = parent.offsetHeight-25; // padding

// Get canvas context
var viewportCtx = viewport.getContext("2d");

/**
    Layers
**/
var layers = [];
var layerCtrl = document.getElementById("layers-list");

// Set up image for rendering
//var renderCanvas = new OffscreenCanvas(renderBoxWidth, renderBoxHeight);
//addLayer(renderCanvas, "render");

// Set up image for drawing
var drawCanvas = new OffscreenCanvas(renderBoxWidth, renderBoxHeight);
drawCanvas.getContext('2d').fillStyle = brushColor;
addLayer(drawCanvas, "brush");

// Set up image for masking
var maskCanvas = document.createElement('canvas');
maskCanvas.width = renderBoxWidth;
maskCanvas.height = renderBoxHeight;
maskCanvas.getContext('2d').fillStyle = maskColor;
addLayer(maskCanvas, "mask");

var currentCanvas = null;
var currentCtx = null;

selectLayer("brush");

var prevX = 0;
var prevY = 0;
// Set up panning
var panX = viewport.width/2 - renderBoxWidth/2;
var panY = viewport.height/2 - renderBoxHeight/2

var panning = false;
var drawing = false;
var masking = false;
var erasing = false;
var moving = false;

function distance2(x1, y1, x2, y2) {
    return Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2);
}

const steps_slider = document.getElementById('steps-slider');
steps_slider.oninput = function() {
  document.getElementById('steps-label').innerText = steps_slider.value;
}

const guidance_slider = document.getElementById('guidance-slider');
guidance_slider.oninput = function() {
  document.getElementById('guidance-label').innerText = guidance_slider.value;
}

const noise_slider = document.getElementById('noise-slider');
noise_slider.oninput = function() {
  document.getElementById('noise-label').innerText = noise_slider.value;
}

const brush_slider = document.getElementById('brush-slider');
brush_slider.oninput = function() {
	document.getElementById('brush-label').innerText = brush_slider.value;
	lineWidth = brush_slider.value;
}

const mask_slider = document.getElementById('mask-slider');
mask_slider.oninput = function() {
	document.getElementById('mask-label').innerText = mask_slider.value;
	lineWidth = mask_slider.value;
}

// Set up the change event handler for the color picker
const color_picker = document.getElementById('brush-color');
color_picker.onchange = function(e) {
    setCurrentTool('brush');
	// Get the chosen color
	lineColor = e.target.value;
	currentCtx.fillStyle = lineColor;
}

// Set up the change event handler for the mask color picker
const mask_picker = document.getElementById('mask-color');
mask_picker.onchange = function(e) {
    setCurrentTool('mask');
	// Get the chosen color
	maskColor = e.target.value;
	currentCtx.fillStyle = maskColor;
}

/**
	Automasking
**/
var autoMaskEnabled = false;
function toggleAutoMask(e) {
	var button = document.getElementById("auto-mask-button");
	if (autoMaskEnabled) {
		autoMaskEnabled = false;
        button.classList.remove("selected");
	} else {
		autoMaskEnabled = true;
		button.classList.add("selected");
	}
	draw();
}

/**
    Toolbar button click
**/
var buttons = document.querySelectorAll(".draw-group");
var currentTool = "brush";
buttons.forEach(function(button) {
    button.addEventListener("click", function() {
        setCurrentTool(button.getAttribute('data-tool'));
    });
});

function setCurrentTool(tool) {
    currentTool = tool;
    buttons.forEach(function(b){
        b.classList.remove("selected");
    });
    document.getElementById(tool+"-button").classList.add("selected");
    
    // select appropriate layer
    if (tool==='brush' || tool==='mask')
        selectLayer(tool);
	
	if (tool==='mask')
		autoMaskEnabled = false;
}

function findLayerByName(name) {
    return layers.find((e) => e.name===name);
}

function findLayerIndexByName(name) {
    return layers.findIndex((e) => e.name===name);
}

function selectLayer(name) {
    var idx = findLayerIndexByName(name);
    layerCtrl.selectedIndex = layers.length-1-idx;
	currentLayer = layers[idx];
    currentCanvas = layers[idx].canvas;
    currentCtx = layers[idx].ctx;
}

function clearImage() {
	currentCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
	var idx = layerCtrl.selectedIndex;
	var lidx = layers.length-idx-1;
	var lyr = layers[lidx];
	if (!(lyr.name=='mask' || lyr.name==='brush' || lyr.name==='render')) {
		layerCtrl.remove(idx);
		layers.splice(lidx, 1);
		selectLayer('brush');
	}
	draw();
}

function updateRenderImage(url) {
	// Create a new image object and set its src property
	var rndrimg = new Image();
	rndrimg.src = url;

	// clear out mask and brush layers
	var lyr = findLayerByName('mask');
	lyr.ctx.clearRect(0, 0, lyr.canvas.width, lyr.canvas.height);
	var lyr = findLayerByName('brush');
	lyr.ctx.clearRect(0, 0, lyr.canvas.width, lyr.canvas.height);
	
	// Draw the image on the canvas when it finishes loading
	rndrimg.onload = function() {
		//const lyr = findLayerByName('render');
		//const ctx = lyr.ctx;
		//ctx.drawImage(rndrimg, -lyr.x, -lyr.y);
		//draw();
		addRenderLayer(rndrimg);
	}
}

// Set up image for rendering
var modelCanvas = document.createElement('canvas');
modelCanvas.width = renderBoxWidth;
modelCanvas.height = renderBoxHeight;
var modelCtx = modelCanvas.getContext('2d', {willReadFrequently: true});

function test_fn() {
    modelCtx.globalCompositeOperation = "source-over"
	modelCtx.clearRect(0, 0, modelCanvas.width, modelCanvas.height);
	for (let lyr of layers) {
		if (lyr.name === 'mask')
			continue;
		modelCtx.drawImage(lyr.canvas, lyr.x, lyr.y);
	}
	
	const idata = modelCtx.getImageData(0, 0, modelCanvas.width, modelCanvas.height);
	const data = idata.data;
	const pixelBuffer = new Uint32Array(data.buffer);
	if (pixelBuffer.every(color => color === 0)) // if all pixels are transparent
		console.log('all');
	else if (pixelBuffer.some(color => color === 0)) {
		console.log('some');
		// create a mask
		for(let i=0; i<data.length; i+=4) {
			if (data[i+3]<0.5) // transparent to white
				data[i] = data[i+1] = data[i+2] = 255;
			else // opaque to black
				data[i] = data[i+1] = data[i+2] = 0;
			data[i+3] = 255;
		}
		
		var formData = new FormData();
		formData.append('width', idata.width);
		formData.append('height', idata.height);
		formData.append('mask', data);

		var xhr = new XMLHttpRequest();
		xhr.open("POST", 'test', true);
		xhr.onload = function () {
		  if (xhr.status === 200) {
			console.log('Success');
		  } else {
			console.error('Error:', xhr);
		  }
		};
		xhr.send(formData);
	}
	else
		console.log('none');
}

function generateModelImage() {
    modelCtx.globalCompositeOperation = "source-over"
	modelCtx.clearRect(0, 0, modelCanvas.width, modelCanvas.height);
	for (let lyr of layers) {
		if (lyr.name === 'mask')
			continue;
		modelCtx.drawImage(lyr.canvas, lyr.x, lyr.y);
	}
	
	const pixelBuffer = new Uint32Array(modelCtx.getImageData(0, 0, modelCanvas.width, modelCanvas.height).data.buffer);
	if (!pixelBuffer.some(color => color !== 0)) // if all pixels are transparent
		return 0;
	
	var dataURL = modelCanvas.toDataURL();
	return dataURL;
}

function generateMaskImage() {
	var masklyr = findLayerByName('mask');
	const pixelBuffer = new Uint32Array(masklyr.ctx.getImageData(0, 0, masklyr.canvas.width, masklyr.canvas.height).data.buffer);
	if (!pixelBuffer.some(color => color !== 0)) // if all pixels are transparent
		return 0;
		
	var dataURL = maskCanvas.toDataURL();
	return dataURL;
}

function draw() {
    viewportCtx.globalCompositeOperation = "source-over"
    
	// Set background color
	viewportCtx.fillStyle = "#666666";

	// Draw background
	viewportCtx.fillRect(0, 0, viewport.width/scale, viewport.height/scale);

	
	// Draw grid
	viewportCtx.lineWidth = 1/scale;

	// Set line color
	viewportCtx.strokeStyle = "#55555588";
	// Reset line dash pattern
	viewportCtx.setLineDash([]);

    var pansX = parseInt(panX/scale);
    var pansY = parseInt(panY/scale);
    
	// Draw vertical lines
	for (var x = pansX%128; x < viewport.width/scale; x += 128) {
        viewportCtx.beginPath();
        viewportCtx.moveTo(x, 0);
        viewportCtx.lineTo(x, viewport.height/scale);
        viewportCtx.stroke();
	}

	// Draw horizontal lines
	for (var y = pansY%128; y < viewport.height/scale; y += 128) {
        viewportCtx.beginPath();
        viewportCtx.moveTo(0, y);
        viewportCtx.lineTo(viewport.width/scale, y);
        viewportCtx.stroke();
	}
	
	// Draw layers onto canvas
	for (let lyr of layers) {
		if (lyr.name === 'mask') {
			if (autoMaskEnabled) continue;
			viewportCtx.globalAlpha = 0.5;
		}
		viewportCtx.drawImage(lyr.canvas, pansX + lyr.x, pansY + lyr.y);
		viewportCtx.globalAlpha = 1;
	}
	
	// render box
	// Set line color
	viewportCtx.strokeStyle = "#EEE";
	// Set line dash pattern
	viewportCtx.setLineDash([5./scale, 5./scale]);
    viewportCtx.lineDashOffset = 0;

    var lyridx = layers.length-layerCtrl.selectedIndex-1;
    var lyr = layers[lyridx];
    var w = lyr.canvas.width;
    var h = lyr.canvas.height;
    
    if (lyr.name != 'render' && lyr.name != 'brush' && lyr.name != 'mask' && pickMouse!=0)
        viewportCtx.lineWidth = boundsLineWidthHighligh/scale;
    else viewportCtx.lineWidth = boundsLineWidth/scale;
    
    var pointerWidth = 0;
    if (currentTool === 'brush' || currentTool === 'eraser')
        pointerWidth = document.getElementById('brush-slider').value;
    else if (currentTool === 'mask')
        pointerWidth = document.getElementById('mask-slider').value;
    pointerWidth *= scale / 2.0;
    
    for (var i=0; i<2; i++) { // alternating black and white dashes
        viewportCtx.beginPath();
        viewportCtx.moveTo(pansX, pansY);
        viewportCtx.lineTo(pansX+w, pansY);
        viewportCtx.lineTo(pansX+w, pansY+h);
        viewportCtx.lineTo(pansX, pansY+h);
        viewportCtx.closePath();
        viewportCtx.stroke();
        
        // handles
        if (lyr.name != 'mask' && lyr.name != 'brush') {
            if (handleMouse==1) viewportCtx.lineWidth = boundsLineWidthHighligh/scale; else viewportCtx.lineWidth = boundsLineWidth/scale;
            viewportCtx.beginPath()
            viewportCtx.arc(pansX+w/2, pansY, handleRadius/scale, 0, 2 * Math.PI);
            viewportCtx.stroke();
            
            if (handleMouse==2) viewportCtx.lineWidth = boundsLineWidthHighligh/scale; else viewportCtx.lineWidth = boundsLineWidth/scale;
            viewportCtx.beginPath()
            viewportCtx.arc(pansX+w, pansY+h/2, handleRadius/scale, 0, 2 * Math.PI);
            viewportCtx.stroke();
            
            if (handleMouse==3) viewportCtx.lineWidth = boundsLineWidthHighligh/scale; else viewportCtx.lineWidth = boundsLineWidth/scale;
            viewportCtx.beginPath()
            viewportCtx.arc(pansX+w/2, pansY+h, handleRadius/scale, 0, 2 * Math.PI);
            viewportCtx.stroke();
            
            if (handleMouse==4) viewportCtx.lineWidth = boundsLineWidthHighligh/scale; else viewportCtx.lineWidth = boundsLineWidth/scale;
            viewportCtx.beginPath()
            viewportCtx.arc(pansX, pansY+h/2, handleRadius/scale, 0, 2 * Math.PI);
            viewportCtx.stroke();
        }
        
        // brush preview
        if (pointerWidth>0 && !spacebarDown) {
            viewportCtx.beginPath()
            viewportCtx.arc(prevX/scale, prevY/scale, pointerWidth, 0, 2 * Math.PI);
            viewportCtx.stroke();
        }
        
        // Set line color
        viewportCtx.strokeStyle = "#111";
        viewportCtx.lineDashOffset = 5/scale;
    }
};

// Set up mousedown event listener
viewport.addEventListener("mousedown", function(e) {
	panning = drawing = erasing = masking = moving = false;

    prevX = e.offsetX;
    prevY = e.offsetY;
	
    var pansX = parseInt(panX/scale);
    var pansY = parseInt(panY/scale);
    
    // Check if left mouse button was pressed
    if ((e.button === 0 && spacebarDown)||e.button===1) {
        // Set panning flag
        panning = true;
    } else if (e.button === 0 && currentTool === 'brush') {
		drawing = true;
        var lineWidth = document.getElementById('brush-slider').value;
		currentCtx.globalCompositeOperation = "source-over";
		currentCtx.beginPath();
		currentCtx.arc((prevX/scale-pansX) -currentLayer.x, (prevY/scale-pansY) -currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
		currentCtx.fill();
		
		if (autoMaskEnabled) {
			maskPath = new Path2D();
			maskPath.arc((prevX/scale-pansX) -currentLayer.x, (prevY/scale-pansY) -currentLayer.y, lineWidth*scale / 2+5*scale, 0, 2 * Math.PI);
		}
		draw();
	} else if (e.button === 0 && currentTool === 'eraser') {
		erasing = true;
        var lineWidth = document.getElementById('brush-slider').value;
		currentCtx.globalCompositeOperation = "destination-out";
		currentCtx.beginPath();
		currentCtx.arc((prevX/scale-pansX) -currentLayer.x, (prevY/scale-pansY) -currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
		currentCtx.fill();
		draw();
	} else if (e.button === 0 && currentTool === 'mask') {
		masking = true;
        var lineWidth = document.getElementById('mask-slider').value;
		currentCtx.globalCompositeOperation = "source-over";
		currentCtx.beginPath();
		currentCtx.arc((prevX/scale-pansX) -currentLayer.x, (prevY/scale-pansY) -currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
		currentCtx.fill();
		draw();
	} else if (e.button === 0 && currentTool === 'move' && (currentLayer.name != 'brush' && currentLayer.name != 'mask')) {
        moving = true;
		draw();
	}
});

// Set up mousemove event listener
viewport.addEventListener("mousemove", function(e) {
    var x = e.offsetX;
    var y = e.offsetY;
    
    var pansX = parseInt(panX/scale);
    var pansY = parseInt(panY/scale);
    
    // Check if panning is enabled
    if (panning) {
        // Calculate difference between starting position and current position
        panX += x - prevX;
        panY += y - prevY;
    } else if (drawing) {
		// Calculate the distance between the current and previous cursor positions
		var dx = x - prevX;
		var dy = y - prevY;
		var distance = Math.sqrt(dx * dx + dy * dy);

		// Calculate the number of intermediate points to draw
		var steps = Math.max(Math.abs(dx), Math.abs(dy)) * scale;

		// Calculate the x and y increments for each intermediate point
		var xIncrement = dx / steps;
		var yIncrement = dy / steps;
		
        var lineWidth = document.getElementById('brush-slider').value;
		// drawCtx.globalCompositeOperation = "source-over";
		// Draw a line between the current and previous cursor positions
		for (var i = 0; i < steps; i++) {
			currentCtx.beginPath();
			currentCtx.arc((prevX/scale-pansX) + xIncrement * i -currentLayer.x, (prevY/scale-pansY) + yIncrement * i -currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
			currentCtx.fill();
			
			if (autoMaskEnabled) {
				path = new Path2D();
				path.arc((prevX/scale-pansX) + xIncrement * i -currentLayer.x, (prevY/scale-pansY) + yIncrement * i -currentLayer.y, lineWidth*scale / 2+5, 0, 2 * Math.PI);
				maskPath.addPath(path);
			}
		}
	} else if (erasing) {
		// Calculate the distance between the current and previous cursor positions
		var dx = x - prevX;
		var dy = y - prevY;
		var distance = Math.sqrt(dx * dx + dy * dy);

		// Calculate the number of intermediate points to draw
		var steps = Math.max(Math.abs(dx), Math.abs(dy));

		// Calculate the x and y increments for each intermediate point
		var xIncrement = dx / steps;
		var yIncrement = dy / steps;
		
        var lineWidth = document.getElementById('brush-slider').value;
		// Draw a line between the current and previous cursor positions
		for (var i = 0; i < steps; i++) {
			currentCtx.beginPath();
			currentCtx.arc((prevX/scale-pansX) + xIncrement * i -currentLayer.x, (prevY/scale-pansY) + yIncrement * i -currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
			currentCtx.fill();
		}
	} else if (masking) {
		// Calculate the distance between the current and previous cursor positions
		var dx = x - prevX;
		var dy = y - prevY;
		var distance = Math.sqrt(dx * dx + dy * dy);

		// Calculate the number of intermediate points to draw
		var steps = Math.max(Math.abs(dx), Math.abs(dy));

		// Calculate the x and y increments for each intermediate point
		var xIncrement = dx / steps;
		var yIncrement = dy / steps;
		
        var lineWidth = document.getElementById('mask-slider').value;
		// drawCtx.globalCompositeOperation = "source-over";
		// Draw a line between the current and previous cursor positions
		for (var i = 0; i < steps; i++) {
			currentCtx.beginPath();
			currentCtx.arc((prevX/scale-pansX) + xIncrement * i -currentLayer.x, (prevY/scale-pansY) + yIncrement * i -currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
			currentCtx.fill();
		}
	} else if (moving) {
        // move the current layer
		var dx = x - prevX;
		var dy = y - prevY;
        
        currentLayer.x += dx/scale;
        currentLayer.y += dy/scale;
    } else { // draw handles
        var lyridx = layers.length-layerCtrl.selectedIndex-1;
        var lyr = layers[lyridx];
        var w = lyr.canvas.width;
        var h = lyr.canvas.height;
        
        var mx = x/scale-pansX;
        var my = y/scale-pansY;
        
        handleMouse = 0;
        if (distance2(mx, my, w/2, 0)<handleRadius2) handleMouse = 1;
        if (distance2(mx, my, w, h/2)<handleRadius2) handleMouse = 2;
        if (distance2(mx, my, w/2, h)<handleRadius2) handleMouse = 3;
        if (distance2(mx, my, 0, h/2)<handleRadius2) handleMouse = 4;
        
        pickMouse = 0;
        if (handleMouse===0){
            if(mx>=-pickRadius && mx<w+pickRadius && Math.abs(my)<=pickRadius) pickMouse = 1;
            if(my>=-pickRadius && my<h+pickRadius && Math.abs(mx)<=pickRadius) pickMouse = 2;
            if(mx>=-pickRadius && mx<w+pickRadius && Math.abs(my-h)<=pickRadius) pickMouse = 3;
            if(my>=-pickRadius && my<h+pickRadius && Math.abs(mx-w)<=pickRadius) pickMouse = 4;
        }
    }
    
    if (panning)
        viewport.style.cursor = 'grabbing';
    else if (spacebarDown)
        viewport.style.cursor = 'grab';
    else if (currentTool === 'brush' ||currentTool === 'brush' || currentTool === 'brush')
		viewport.style.cursor = 'none';
    else
        viewport.style.cursor = 'default';

    prevX = x;
    prevY = y;
    
    draw();
});

// Set up mouseup event listener
viewport.addEventListener("mouseup", function(e) {
    // Check if left mouse button was released
    if (e.button === 0) {
		if (drawing && autoMaskEnabled) {
			var lyr = findLayerByName('mask');
			lyr.ctx.fill(maskPath);
		}
    }
    // Reset flags
    panning = drawing = erasing = masking = moving = false;
    draw();
});

layerCtrl.addEventListener("change", function(e) {
    selectLayer(e.target.value);
    draw();
});

function addLayer(canvas, name, position=-1) {
    var ctx = canvas.getContext('2d');
    var lyr = {name: name, canvas: canvas, ctx: ctx, x: 0, y: 0}
    if (position===-1)
        layers.push(lyr);
    else
        layers.splice(position, 0, lyr);
	
	layerCtrl.options.length = 0;
	for (let i=layers.length-1; i>=0; i--) {
		var lyr = layers[i];
		layerCtrl.options[layerCtrl.options.length] = new Option(lyr.name, lyr.name);
	}
	layerCtrl.selectedIndex = 0;
}

function addRenderLayer(img) {
	var cvs = new OffscreenCanvas(img.width, img.height);
	var ctx = cvs.getContext('2d');
	ctx.drawImage(img, 0, 0);
	var name = 'render'+layers.length;
	addLayer(cvs, name, layers.length-2);
	selectLayer(name);
	setCurrentTool("move");
	draw();
}

// Add event listener for dropped files
viewport.ondrop = function(e) {
  e.preventDefault();

  // Get dropped file
  var file = e.dataTransfer.files[0];

  // Create FileReader to read file
  var reader = new FileReader();

  // Set onload event listener for reader
  reader.onload = function() {
    // Get data URL of file
    var dataURL = reader.result;

	var img = document.createElement("img")
	// Set onload event listener for image element
	img.onload = function() {
        var cvs = new OffscreenCanvas(img.width, img.height);
        var ctx = cvs.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var name = 'image'+layers.length;
		addLayer(cvs, name, layers.length-2);
        selectLayer(name);
        setCurrentTool("move");
		draw();
	}
    // Set src of image to data URL
    img.src = dataURL;
  }

  // Read file as data URL
  reader.readAsDataURL(file);
}

// Add event listener for dragged files
viewport.ondragover = function(e) {
  e.preventDefault();
}

window.onload = function(e) {
	draw();
}

document.addEventListener('keydown', function(e) {
	if (e.key === ' ') {
		spacebarDown = true;
	}
});

document.addEventListener('keyup', function(e) {
	if (e.key === ' ') {
		spacebarDown = false;
	}
});

viewport.addEventListener('wheel', function(e) {
  // Calculate the new scale factor based on the mouse wheel delta
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale *= delta;

  // Clamp the scale to a minimum of 0.1 and a maximum of 10
  scale = Math.max(0.1, Math.min(scale, 10));

  // Set the transformation matrix for the canvas context
  viewportCtx.setTransform(scale, 0, 0, scale, 0, 0);
  
  draw();
});
