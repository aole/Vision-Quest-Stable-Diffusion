
var cacheBustingParam = Date.now();

var spacebarDown = false;

var renderBoxWidth = 512;
var renderBoxHeight = 512;

var newDocument = true;

let scale = 1.0;
let handleRadius = 10;
let handleRadius2 = handleRadius*handleRadius;
let pickRadius = 5;

let handleMouse = 0; // 0: None, 1: Top, 2: Right, 3: Bottom, 4: Left
let pickMouse = 0;

let boundsLineWidth = 1;
let boundsLineWidthHighligh = 3;

// Get parent element
var parent = document.getElementById("center-panel");

// Get canvas element
var canvas = document.getElementById("visCanvas");

// Set canvas dimensions to match parent element
canvas.width = parent.offsetWidth-40; // padding
canvas.height = parent.offsetHeight-40; // padding

// Get canvas context
var ctx = canvas.getContext("2d");

// image layers
var layers = [];
var layerCtrl = document.getElementById("layers");

// Set up image for rendering
var renderCanvas = new OffscreenCanvas(renderBoxWidth, renderBoxHeight);
var renderCtx = renderCanvas.getContext('2d');

addLayer(renderCanvas, "Render");

// Set up image for drawing
var drawCanvas = new OffscreenCanvas(renderBoxWidth, renderBoxHeight);
var drawCtx = drawCanvas.getContext('2d');
addLayer(drawCanvas, "Draw/Paint");

// Set up image for masking
var maskCanvas = new OffscreenCanvas(renderBoxWidth, renderBoxHeight);
var maskCtx = maskCanvas.getContext('2d');
addLayer(maskCanvas, "Mask");
layerCtrl.selectedIndex = 1;

var prevX = 0;
var prevY = 0;
// Set up panning
var panX = canvas.width/2 - renderBoxWidth/2;
var panY = canvas.height/2 - renderBoxHeight/2;
var panning = false;

function distance2(x1, y1, x2, y2) {
    return Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2);
}

const steps_slider = document.getElementById('steps-slider');
steps_slider.oninput = function() {
  document.getElementById('steps-label').innerText = steps_slider.value;
}

function updateRenderImage(url) {
	// Create a new image object and set its src property
	var rndrimg = new Image();
	rndrimg.src = url;

	// Draw the image on the canvas when it finishes loading
	rndrimg.onload = function() {
		newDocument = false;
		renderCtx.drawImage(rndrimg, 0, 0);
		draw();
	}
}

function draw() {
    ctx.globalCompositeOperation = "source-over"
    
	// Set background color
	ctx.fillStyle = "#666666";

	// Draw background
	ctx.fillRect(0, 0, canvas.width/scale, canvas.height/scale);

	
	// Draw grid
	ctx.lineWidth = 1/scale;

	// Set line color
	ctx.strokeStyle = "#55555588";
	// Reset line dash pattern
	ctx.setLineDash([]);

	// Draw vertical lines
	for (var x = panX%128; x < canvas.width/scale; x += 128) {
	  ctx.beginPath();
	  ctx.moveTo(x, 0);
	  ctx.lineTo(x, canvas.height/scale);
	  ctx.stroke();
	}

	// Draw horizontal lines
	for (var y = panY%128; y < canvas.height/scale; y += 128) {
	  ctx.beginPath();
	  ctx.moveTo(0, y);
	  ctx.lineTo(canvas.width/scale, y);
	  ctx.stroke();
	}
	
	// Draw layers onto canvas
	for (let lyr of layers) {
		ctx.drawImage(lyr.image, panX, panY);
	}
	
	// render box
	// Set line color
	ctx.strokeStyle = "#EEE";
	// Set line dash pattern
	ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = 0;

    for (var i=0; i<2; i++) {
        var lyridx = layers.length-layerCtrl.selectedIndex-1;
        var lyr = layers[lyridx];
        var w = lyr.image.width;
        var h = lyr.image.height;
        
        if (lyr.name != 'Render' && lyr.name != 'Draw/Paint' && lyr.name != 'Mask' && pickMouse!=0) ctx.lineWidth = boundsLineWidthHighligh/scale; else ctx.lineWidth = boundsLineWidth/scale;
        ctx.beginPath();
        ctx.moveTo(panX, panY);
        ctx.lineTo(panX+w, panY);
        ctx.lineTo(panX+w, panY+h);
        ctx.lineTo(panX, panY+h);
        ctx.closePath();
        ctx.stroke();
        
        // handles
        if (lyr.name != 'Mask' && lyr.name != 'Draw/Paint') {
            if (handleMouse==1) ctx.lineWidth = boundsLineWidthHighligh/scale; else ctx.lineWidth = boundsLineWidth/scale;
            ctx.beginPath()
            ctx.arc(panX+w/2, panY, handleRadius/scale, 0, 2 * Math.PI);
            ctx.stroke();
            
            if (handleMouse==2) ctx.lineWidth = boundsLineWidthHighligh/scale; else ctx.lineWidth = boundsLineWidth/scale;
            ctx.beginPath()
            ctx.arc(panX+w, panY+h/2, handleRadius/scale, 0, 2 * Math.PI);
            ctx.stroke();
            
            if (handleMouse==3) ctx.lineWidth = boundsLineWidthHighligh/scale; else ctx.lineWidth = boundsLineWidth/scale;
            ctx.beginPath()
            ctx.arc(panX+w/2, panY+h, handleRadius/scale, 0, 2 * Math.PI);
            ctx.stroke();
            
            if (handleMouse==4) ctx.lineWidth = boundsLineWidthHighligh/scale; else ctx.lineWidth = boundsLineWidth/scale;
            ctx.beginPath()
            ctx.arc(panX, panY+h/2, handleRadius/scale, 0, 2 * Math.PI);
            ctx.stroke();
        }
        // Set line color
        ctx.strokeStyle = "#111";
        // Set line dash pattern
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = 5;
    }
};

// Set up mousedown event listener
canvas.addEventListener("mousedown", function(e) {
    // Check if left mouse button was pressed
    if (e.button === 0 && spacebarDown) {
        // Set panning flag
        panning = true;
    }

    prevX = e.clientX;
    prevY = e.clientY;
});

// Set up mousemove event listener
canvas.addEventListener("mousemove", function(e) {
    var x = e.clientX;
    var y = e.clientY;
    
    var offsetX = e.offsetX;
    var offsetY = e.offsetY;
    
    // Check if panning is enabled
    if (panning && spacebarDown) {
        // Calculate difference between starting position and current position
        panX += x - prevX;
        panY += y - prevY;

        draw();
    } else {
        var lyridx = layers.length-layerCtrl.selectedIndex-1;
        var lyr = layers[lyridx];
        // if (lyr.name === 'Render') {
            var w = lyr.image.width;
            var h = lyr.image.height;
            
            var mx = offsetX/scale-panX;
            var my = offsetY/scale-panY;
            
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
        // }
    }

    prevX = x;
    prevY = y;
    
    draw();
});

// Set up mouseup event listener
canvas.addEventListener("mouseup", function(e) {
    // Check if left mouse button was released
    if (e.button === 0) {
        // Reset panning flag
        panning = false;
    }
});

layerCtrl.addEventListener("change", function() {
    draw();
});

function addLayer(img, name='') {
	if (name=='')
		name = 'Layer'+(layers.length+1);
	layers.push({name: name, image: img});
	
	layerCtrl.options.length = 0;
	for (let i=layers.length-1; i>=0; i--) {
		var lyr = layers[i];
		layerCtrl.options[layerCtrl.options.length] = new Option(lyr.name, lyr.name);
	}
	layerCtrl.selectedIndex = 0;
}

// Add event listener for dropped files
canvas.ondrop = function(e) {
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
		addLayer(img);
		draw();
	}
    // Set src of image to data URL
    img.src = dataURL;
  }

  // Read file as data URL
  reader.readAsDataURL(file);
}

// Add event listener for dragged files
canvas.ondragover = function(e) {
  e.preventDefault();
}

window.onload = function(e) {
	draw();
}

document.addEventListener('keydown', function(e) {
	if (e.key === ' ') {
		spacebarDown = true;
		canvas.style.cursor = "grab";
	}
});

document.addEventListener('keyup', function(e) {
	if (e.key === ' ') {
		spacebarDown = false;
		canvas.style.cursor = "default";
	}
});

canvas.addEventListener('wheel', function(e) {
  // Calculate the new scale factor based on the mouse wheel delta
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale *= delta;

  // Clamp the scale to a minimum of 0.1 and a maximum of 10
  scale = Math.max(0.1, Math.min(scale, 10));

  // Set the transformation matrix for the canvas context
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  
  draw();
});
