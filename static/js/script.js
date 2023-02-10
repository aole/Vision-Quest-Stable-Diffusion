
var cacheBustingParam = Date.now();

var spacebarDown = false;
var ctrlDown = false;
var shiftDown = false;

var tempX = 0;
var tempY = 0;
var renderBoxWidth = 512;
var renderBoxHeight = 512;

var origX = 0;
var origY = 0;
var gridSize = 64;

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

var undo = new UndoManager();

// Get parent element
var parent = document.getElementById("canvas-container");

// Get canvas element
var viewport = document.getElementById("visCanvas");

// Set canvas dimensions to match parent element
viewport.width = parent.offsetWidth-25; // padding
viewport.height = parent.offsetHeight-25; // padding

// Get canvas context
var viewportCtx = viewport.getContext("2d");

var lyrMgr = new LayerManager(renderBoxWidth, renderBoxHeight, brushColor, maskColor);

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
var boxing = false;

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

const batch_slider = document.getElementById('batch-slider');
batch_slider.oninput = function() {
  document.getElementById('batch-label').innerText = batch_slider.value;
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
	lyrMgr.currentCtx.fillStyle = lineColor;
}

// Set up the change event handler for the mask color picker
const mask_picker = document.getElementById('mask-color');
mask_picker.onchange = function(e) {
    setCurrentTool('mask');
	// Get the chosen color
	maskColor = e.target.value;
	lyrMgr.currentCtx.fillStyle = maskColor;
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
        lyrMgr.selectLayer(tool);
	
	if (tool==='mask')
		autoMaskEnabled = false;
}

function updateRenderImage(url, batch_size) {
	// Create a new image object and set its src property
	for (var i=0; i<batch_size; i++) {
		lyrMgr.addRenderLayer(url+i+'.png');
	}

	// clear out mask and brush layers
	var lyr = lyrMgr.findLayerByName('mask');
	// lyr.ctx.clearRect(0, 0, lyr.canvas.width, lyr.canvas.height);
	var lyr = lyrMgr.findLayerByName('brush');
	lyr.ctx.clearRect(0, 0, lyr.canvas.width, lyr.canvas.height);
}

// Set up image for rendering
var modelCanvas = document.createElement('canvas');
modelCanvas.width = renderBoxWidth;
modelCanvas.height = renderBoxHeight;
var modelCtx = modelCanvas.getContext('2d', {willReadFrequently: true});

function generateModelImage() {
    modelCtx.globalCompositeOperation = "source-over"
	modelCtx.clearRect(0, 0, modelCanvas.width, modelCanvas.height);
	for (let lyr of lyrMgr.layers) {
		if (lyr.name === 'mask' || !lyr.visible)
			continue;
		modelCtx.drawImage(lyr.canvas, lyr.x, lyr.y);
	}
	
	const idata = modelCtx.getImageData(0, 0, modelCanvas.width, modelCanvas.height);
	const data = idata.data;
	const pixelBuffer = new Uint32Array(data.buffer);
	var mode = 'NA';
	if (pixelBuffer.every(color => color === 0)) { // if all pixels are transparent
		mode = 'ALLTRANS';
		return [mode, 0, 0];
	}
	else if (pixelBuffer.some(color => color === 0)) {
		mode = 'SOMETRANS';
		var dataURL = modelCanvas.toDataURL();
		// create a mask
		for(let i=0; i<data.length; i+=4) {
			if (data[i+3]<0.5) { // transparent to white
				data[i] = data[i+1] = data[i+2] = 255;
				data[i+3] = 1;
			}
			else { // opaque to transparent
				data[i] = data[i+1] = data[i+2] = 0;
				data[i+3] = 0;
			}
		}
		modelCtx.putImageData(idata, 0, 0);
		var maskURL = modelCanvas.toDataURL();
		return [mode, dataURL, maskURL];
	}
	else mode = 'ALLOPAQUE';
	
	var dataURL = modelCanvas.toDataURL();
	return [mode, dataURL, 0]
}

function generateMaskImage() {
	var masklyr = lyrMgr.findLayerByName('mask');
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
	for (var x = pansX%gridSize; x < viewport.width/scale; x += gridSize) {
        viewportCtx.beginPath();
        viewportCtx.moveTo(x, 0);
        viewportCtx.lineTo(x, viewport.height/scale);
        viewportCtx.stroke();
	}

	// Draw horizontal lines
	for (var y = pansY%gridSize; y < viewport.height/scale; y += gridSize) {
        viewportCtx.beginPath();
        viewportCtx.moveTo(0, y);
        viewportCtx.lineTo(viewport.width/scale, y);
        viewportCtx.stroke();
	}
	
	// Draw layers onto canvas
	for (let lyr of lyrMgr.layers) {
        if (!lyr.visible) continue;
		if (lyr.name === 'mask') {
			if (autoMaskEnabled) continue;
			viewportCtx.globalAlpha = 0.5;
		}
        var x = pansX + lyr.x;
        var y = pansY + lyr.y;
        if (boxing && (lyr.name === 'mask' || lyr.name === 'brush')) {
			x += tempX;
			y += tempY;
        }
		viewportCtx.drawImage(lyr.canvas, x, y);
		viewportCtx.globalAlpha = 1;
	}
	
	// render box
	// Set line color
	viewportCtx.strokeStyle = "#EEE";
	// Set line dash pattern
	viewportCtx.setLineDash([5./scale, 5./scale]);
    viewportCtx.lineDashOffset = 0;

    var w = renderBoxWidth;
    var h = renderBoxHeight;
    
    if (pickMouse!=0 && currentTool === 'move')
        viewportCtx.lineWidth = boundsLineWidthHighligh/scale;
    else viewportCtx.lineWidth = boundsLineWidth/scale;
    
    var pointerWidth = 0;
    if (currentTool === 'brush' || currentTool === 'eraser')
        pointerWidth = document.getElementById('brush-slider').value;
    else if (currentTool === 'mask')
        pointerWidth = document.getElementById('mask-slider').value;
    pointerWidth *= scale / 2.0;
    
    if (!spacebarDown && !ctrlDown) {
        for (var i=0; i<2; i++) {
            var bx = pansX;
            var by = pansY;
            var trbx = tempX/scale;
            var trby = tempY/scale
            if (boxing) {
                var dx = gridSize*parseInt(trbx/gridSize) + (trbx%gridSize < gridSize/2 ? 0 : gridSize);
                var dy = gridSize*parseInt(trby/gridSize) + (trby%gridSize < gridSize/2 ? 0 : gridSize);
                
                bx += parseInt(dx);
                by += parseInt(dy);
            }
            
            // alternating black and white dashes (render box)
            viewportCtx.beginPath();
            viewportCtx.moveTo(bx, by);
            viewportCtx.lineTo(bx+w, by);
            viewportCtx.lineTo(bx+w, by+h);
            viewportCtx.lineTo(bx, by+h);
            viewportCtx.closePath();
            viewportCtx.stroke();
            
            // handles
            if (!boxing) {
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
            if (pointerWidth>0) {
                viewportCtx.beginPath()
                viewportCtx.arc(prevX/scale, prevY/scale, pointerWidth, 0, 2 * Math.PI);
                viewportCtx.stroke();
            }
            
            // Set line color
            viewportCtx.strokeStyle = "#111";
            viewportCtx.lineDashOffset = 5/scale;
        }
    }
};

// Set up mousedown event listener
viewport.addEventListener("mousedown", function(e) {
	panning = drawing = erasing = masking = moving = boxing = false;

    prevX = e.offsetX;
    prevY = e.offsetY;
	
    var pansX = parseInt(panX/scale);
    var pansY = parseInt(panY/scale);
    
    if (e.button===0 && ctrlDown && currentTool=='move') {
        var x = (prevX-panX) / scale;
        var y = (prevX-panY) / scale;
        var lyr = lyrMgr.getLayerAtLocation(x, y);
        if (lyr) lyrMgr.selectLayer(lyr.name);
    }
    
    if (!lyrMgr.currentLayer.visible) return;
    
    // Check if left mouse button was pressed
    if ((e.button === 0 && spacebarDown)||e.button===1) {
        // Set panning flag
        panning = true;
    } else if (e.button === 0 && currentTool === 'brush') {
		drawing = true;
        var lineWidth = document.getElementById('brush-slider').value;
		lyrMgr.currentCtx.globalCompositeOperation = "source-over";
		lyrMgr.currentCtx.beginPath();
		lyrMgr.currentCtx.arc((prevX/scale-pansX) -lyrMgr.currentLayer.x, (prevY/scale-pansY) -lyrMgr.currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
		lyrMgr.currentCtx.fill();
		
		if (autoMaskEnabled) {
			maskPath = new Path2D();
			maskPath.arc((prevX/scale-pansX) -lyrMgr.currentLayer.x, (prevY/scale-pansY) -lyrMgr.currentLayer.y, lineWidth*scale / 2+5*scale, 0, 2 * Math.PI);
		}
	} else if (e.button === 0 && currentTool === 'eraser') {
		erasing = true;
        var lineWidth = document.getElementById('brush-slider').value;
		lyrMgr.currentCtx.globalCompositeOperation = "destination-out";
		lyrMgr.currentCtx.beginPath();
		lyrMgr.currentCtx.arc((prevX/scale-pansX) -lyrMgr.currentLayer.x, (prevY/scale-pansY) -lyrMgr.currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
		lyrMgr.currentCtx.fill();
	} else if (e.button === 0 && currentTool === 'mask') {
		masking = true;
        var lineWidth = document.getElementById('mask-slider').value;
		lyrMgr.currentCtx.globalCompositeOperation = "source-over";
		lyrMgr.currentCtx.beginPath();
		lyrMgr.currentCtx.arc((prevX/scale-pansX) -lyrMgr.currentLayer.x, (prevY/scale-pansY) -lyrMgr.currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
		lyrMgr.currentCtx.fill();
	} else if (pickMouse > 0 && currentTool === 'move') {
		boxing = true;
	} else if (e.button === 0 && currentTool === 'move' && (lyrMgr.currentLayer.name != 'brush' && lyrMgr.currentLayer.name != 'mask')) {
        moving = true;
        origX = lyrMgr.currentLayer.x;
        origY = lyrMgr.currentLayer.y;
	}
	
    draw();
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
			lyrMgr.currentCtx.beginPath();
			lyrMgr.currentCtx.arc((prevX/scale-pansX) + xIncrement * i -lyrMgr.currentLayer.x, (prevY/scale-pansY) + yIncrement * i -lyrMgr.currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
			lyrMgr.currentCtx.fill();
			
			if (autoMaskEnabled) {
				path = new Path2D();
				path.arc((prevX/scale-pansX) + xIncrement * i -lyrMgr.currentLayer.x, (prevY/scale-pansY) + yIncrement * i -lyrMgr.currentLayer.y, lineWidth*scale / 2+5, 0, 2 * Math.PI);
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
			lyrMgr.currentCtx.beginPath();
			lyrMgr.currentCtx.arc((prevX/scale-pansX) + xIncrement * i -lyrMgr.currentLayer.x, (prevY/scale-pansY) + yIncrement * i -lyrMgr.currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
			lyrMgr.currentCtx.fill();
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
			lyrMgr.currentCtx.beginPath();
			lyrMgr.currentCtx.arc((prevX/scale-pansX) + xIncrement * i -lyrMgr.currentLayer.x, (prevY/scale-pansY) + yIncrement * i -lyrMgr.currentLayer.y, lineWidth*scale / 2, 0, 2 * Math.PI);
			lyrMgr.currentCtx.fill();
		}
	} else if (boxing) {
		// move the render box
		var dx = x - prevX;
		var dy = y - prevY;
		tempX += dx;
		tempY += dy;
	} else if (moving) {
        // move the current layer
		var dx = x - prevX;
		var dy = y - prevY;
        
        lyrMgr.currentLayer.x += dx/scale;
        lyrMgr.currentLayer.y += dy/scale;
    } else { // draw handles
        var w = renderBoxWidth;
        var h = renderBoxHeight;
        
        var mx = x/scale-pansX;
        var my = y/scale-pansY;
        
        handleMouse = 0;
        if (distance2(mx, my, w/2, 0)<handleRadius2) handleMouse = 1;
        else if (distance2(mx, my, w, h/2)<handleRadius2) handleMouse = 2;
        else if (distance2(mx, my, w/2, h)<handleRadius2) handleMouse = 3;
        else if (distance2(mx, my, 0, h/2)<handleRadius2) handleMouse = 4;
        
        pickMouse = 0;
        if (handleMouse===0){
            if(mx>=-pickRadius && mx<w+pickRadius && Math.abs(my)<=pickRadius) pickMouse = 1;
            else if(my>=-pickRadius && my<h+pickRadius && Math.abs(mx)<=pickRadius) pickMouse = 2;
            else if(mx>=-pickRadius && mx<w+pickRadius && Math.abs(my-h)<=pickRadius) pickMouse = 3;
            else if(my>=-pickRadius && my<h+pickRadius && Math.abs(mx-w)<=pickRadius) pickMouse = 4;
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
			var lyr = lyrMgr.findLayerByName('mask');
			lyr.ctx.fill(maskPath);
		} else if (boxing) {
            var trbx = tempX/scale;
            var trby = tempY/scale
            
            var dx = gridSize*parseInt(trbx/gridSize) + (trbx%gridSize < gridSize/2 ? 0 : gridSize);
            var dy = gridSize*parseInt(trby/gridSize) + (trby%gridSize < gridSize/2 ? 0 : gridSize);
            
			panX += dx*scale;
			panY += dy*scale;
            
			for(let lyr of lyrMgr.layers) {
				if (lyr.name=='mask' || lyr.name==='brush') continue;
				lyr.x -= dx;
				lyr.y -= dy;
			}
			tempX = tempY = 0;
		} else if (moving) {
            if (!(origX===lyrMgr.currentLayer.x && origY===lyrMgr.currentLayer.y))
                undo.add(new LayerMovedChange(lyrMgr.currentLayer, origX, origY, lyrMgr.currentLayer.x, lyrMgr.currentLayer.y));
        }
    }
    // Reset flags
    panning = drawing = erasing = masking = moving = boxing = false;
    draw();
});

lyrMgr.layerCtrl.addEventListener("change", function(e) {
    lyrMgr.selectLayer(e.target.value);
    draw();
});

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
        var name = lyrMgr.createLayerName('image');
		lyrMgr.addLayer(cvs, name, lyrMgr.layers.length-2);
        lyrMgr.selectLayer(name);
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
    if (e.ctrlKey) ctrlDown = true;
    if (e.shiftKey) shiftDown = true;
    
	if (e.key === ' ') {
		spacebarDown = true;
	} else if (ctrlDown && shiftDown && e.key === 'Z') {
        undo.redo();
        draw();
    } else if (ctrlDown && e.key === 'z') {
        undo.undo();
        draw();
	}
});

document.addEventListener('keyup', function(e) {
    ctrlDown = false;
    shiftDown = false;
	if (e.key === ' ') {
		spacebarDown = false;
	} else if (e.key === 'h') {
		maskLayer.visible = !maskLayer.visible;
		refreshLayerControl();
		draw();
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

function clearLayer() { lyrMgr.clearLayer(); draw(); }
function combineLayers() { lyrMgr.combineLayers(); draw(); }
function moveLayerDown() { lyrMgr.moveLayerDown(); draw(); }
function moveLayerUp() { lyrMgr.moveLayerUp(); draw(); }
function toggleVisible() { lyrMgr.toggleVisible(); draw(); }
function saveImage() { lyrMgr.saveImage(); }
