$(document).ready(function() {
	var cacheBustingParam = Date.now();

  // Create a new image object and set its src property
  var img = new Image();
  img.src = '/static/images/image.png?v=' + cacheBustingParam;

  // Get the canvas element and its context
  var canvas = $('#canvas')[0];
  var ctx = canvas.getContext('2d', { alpha: true });

  // Draw the image on the canvas when it finishes loading
  img.onload = function() {
    ctx.drawImage(img, 0, 0);
  }

  // Set up the temporary image
  // var tempCanvas = document.createElement('canvas');
  var tempCanvas = new OffscreenCanvas(512, 512);
  //tempCanvas.width = canvas.width;
  //tempCanvas.height = canvas.height;
  var tempCtx = tempCanvas.getContext('2d', { alpha: true });
  // tempCtx.fillRect(0, 0, 512, 512);
  
  var previousX, previousY;
  
  // Set the pen width to the value of the pen-width slider
  var lineWidth = $('[name=pen-width]').val();

  // Update the pen-width value display
  $('#pen-width-value').html($('[name=pen-width]').val());
  
  // Set up the change event handler for the color picker
  $('#color-picker').on('change', function(event) {
    // Get the chosen color
    var color = $(this).val();
    // Set the pen color to the chosen color
    tempCtx.strokeStyle = color;
    tempCtx.fillStyle = color;
  });

  // Set up an input event handler for the pen-width slider
  $('[name=pen-width]').on('input', function(event) {
    // Set the pen width to the value of the pen-width slider
    lineWidth = $(this).val();
    // Update the pen-width value display
    $('#pen-width-value').html($(this).val());
  });

  // Set up the mousedown event handler
  canvas.addEventListener('mousedown', function(event) {
    if (event.button === 0) { // Only start drawing if the left mouse button is pressed
        previousX = event.offsetX;
        previousY = event.offsetY;
    }
  });

  // Set up the mousemove event handler
  canvas.addEventListener('mousemove', function(event) {
    if (event.buttons === 1) { // Only draw if the left mouse button is being held down
      var x = event.offsetX;
      var y = event.offsetY;

      // Calculate the distance between the current and previous cursor positions
      var dx = x - previousX;
      var dy = y - previousY;
      var distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate the number of intermediate points to draw
      var steps = Math.max(Math.abs(dx), Math.abs(dy)); //distance / (tempCtx.lineWidth / 2);

      // Calculate the x and y increments for each intermediate point
      var xIncrement = dx / steps;
      var yIncrement = dy / steps;
	  
	  if ($('#draw-button').hasClass('active')) { // Left mouse button in draw mode
		tempCtx.globalCompositeOperation = "source-over";
		// tempCtx.fillStyle = "rgba(0, 0, 200, 0.1)";
		// Draw a line between the current and previous cursor positions
		  for (var i = 0; i < steps; i++) {
			tempCtx.beginPath();
			tempCtx.arc(previousX + xIncrement * i, previousY + yIncrement * i, lineWidth / 2, 0, 2 * Math.PI);
			tempCtx.fill();
		  }
	  }
	  else if ($('#erase-button').hasClass('active')) { // Left mouse button in erase mode
		tempCtx.globalCompositeOperation = "destination-out";
		// tempCtx.fillStyle = "rgba(0, 0, 0, 1)"; // Use a transparent color to erase
		// Erase a line between the current and previous cursor positions
		  for (var i = 0; i < steps; i++) {
			tempCtx.beginPath();
			tempCtx.arc(previousX + xIncrement * i, previousY + yIncrement * i, lineWidth / 2, 0, 2 * Math.PI);
			tempCtx.fill();
		  }
	  }
      // Save the current cursor position as the previous position
      previousX = x;
      previousY = y;
      
      ctx.drawImage(img, 0, 0);
      // Draw the temporary image on top of the canvas
      ctx.drawImage(tempCanvas, 0, 0);
    }
  });

  // Set up the mouseup event handler
  canvas.addEventListener('mouseup', function(event) {
    if (event.button === 0) { // Only stop drawing if the left mouse button is released
      // tempCtx.closePath();
    }
  });
  
  // Set up the click event handler for the mode buttons
$('#mode-buttons button').click(function(event) {
  // Remove the active class from all buttons
  $('#mode-buttons button').toggleClass('active', false);
  // Add the active class to the clicked button
  $(this).toggleClass('active', true);
});

	$('#clear-button').click(function() {
		// Create a new image object
		var img = new Image();
		img.src = '/static/images/image.png';

		// When the image finishes loading, redraw it on the canvas
		img.onload = function() {
		// Clear the temporary image
		tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
		// Redraw the original image on the canvas
		ctx.drawImage(img, 0, 0);
		}
	});


  $('#form').submit(function(event) {
    event.preventDefault();
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/generate');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
      if (xhr.status === 200) {
        var img = new Image();
        img.src = xhr.responseText;
        var ctx = $('#canvas')[0].getContext('2d');
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    };
    xhr.send('prompt=' + encodeURIComponent($('[name=prompt]').val())
      + '&steps=' + encodeURIComponent($('[name=steps]').val())
      + '&usegpu=' + encodeURIComponent($('[name=use-gpu]').is(':checked')));
  });

  $('[name=steps]').on('input', function(event) {
    $('#steps-value').html($(this).val());
  });
});
