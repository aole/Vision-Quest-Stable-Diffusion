$(document).ready(function() {
  // Create a new image object and set its src property
  var img = new Image();
  img.src = '/static/images/image.png';

  // Get the canvas element and its context
  var canvas = $('#canvas')[0];
  var ctx = canvas.getContext('2d');

  // Draw the image on the canvas when it finishes loading
  img.onload = function() {
    ctx.drawImage(img, 0, 0);
  }

  // Set up the temporary image
  var tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  var tempCtx = tempCanvas.getContext('2d');
  
  var previousX, previousY;
  
  // Set the pen width to the value of the pen-width slider
  tempCtx.lineWidth = $('[name=pen-width]').val();

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
    tempCtx.lineWidth = $(this).val();
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
      var steps = distance / (tempCtx.lineWidth / 2);

      // Calculate the x and y increments for each intermediate point
      var xIncrement = dx / steps;
      var yIncrement = dy / steps;

      // Draw intermediate points between the current and previous cursor positions
      for (var i = 0; i < steps; i++) {
        tempCtx.beginPath();
        tempCtx.arc(previousX + xIncrement * i, previousY + yIncrement * i, tempCtx.lineWidth / 2, 0, 2 * Math.PI);
        tempCtx.fill();
      }

      // Save the current cursor position as the previous position
      previousX = x;
      previousY = y;
      
      // Draw the temporary image on top of the canvas
      ctx.drawImage(tempCanvas, 0, 0);
    }
  });

  // Set up the mouseup event handler
  canvas.addEventListener('mouseup', function(event) {
    if (event.button === 0) { // Only stop drawing if the left mouse button is released
      tempCtx.closePath();
    }
  });
    $('#clear-button').click(function() {
    // Clear the temporary image
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    // Redraw the original image on the canvas
    ctx.drawImage(img, 0, 0);
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
