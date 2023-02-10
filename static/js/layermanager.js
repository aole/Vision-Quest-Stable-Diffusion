// layermanager

class Layer {
}

class LayerManager {
    constructor(w, h, brushColor, maskColor) {
        this.layerCtrl = document.getElementById("layers-list");
        
        this.layers = [];
        
        // Set up image for drawing
        this.drawCanvas = new OffscreenCanvas(w, h);
        this.brushLayer = this.currentLayer = this.addLayer(this.drawCanvas, "brush", -1, false);
        this.currentCanvas = this.drawCanvas;
        this.currentCtx = this.currentLayer.ctx;

        // Set up image for masking
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = renderBoxWidth;
        this.maskCanvas.height = renderBoxHeight;
        this.maskLayer = this.addLayer(this.maskCanvas, "mask");
    }
    
    getBrushLayer() { return this.brushLayer; }
    getMaskLayer() { return this.maskLayer; }
    
    addLayer(canvas, name, position=-1, refresh=true) {
        var ctx = canvas.getContext('2d');
        var lyr = {name: name, canvas: canvas, ctx: ctx, x: 0, y: 0, visible: true}
        if (position===-1)
            this.layers.push(lyr);
        else
            this.layers.splice(position, 0, lyr);
        
        if (refresh) this.refreshLayerControl();
        
        return lyr;
    }
    
    findLayerByName(name) {
        return this.layers.find((e) => e.name===name);
    }

    findLayerIndexByName(name) {
        return this.layers.findIndex((e) => e.name===name);
    }

    selectLayer(name) {
        var idx = this.findLayerIndexByName(name);
        this.selectLayerByIndex(idx);
    }

    selectLayerByIndex(idx) {
        this.layerCtrl.selectedIndex = this.layers.length-1-idx;
        this.currentLayer = this.layers[idx];
        this.currentCanvas = this.layers[idx].canvas;
        this.currentCtx = this.layers[idx].ctx;
    }
    
    refreshLayerControl() {
        var selectidx = 0;
        var li = 0;
        const max_len = 30;
        this.layerCtrl.options.length = 0;
        for (let i=this.layers.length-1; i>=0; i--) {
            var lyr = this.layers[i];
            var caption = lyr.name;
            var l = max_len-caption.length;
            caption += '_'.repeat(l) + (lyr.visible?'@':'_');
            this.layerCtrl.options[this.layerCtrl.options.length] = new Option(caption, lyr.name);
            if (lyr.name === this.currentLayer.name)
                selectidx = li;
            li++;
        }
        this.layerCtrl.selectedIndex = selectidx;
    }
    
    createLayerName(prefix) {
        var num = 1;
        for(var lyr of this.layers) {
            if (lyr.name.substring(0, prefix.length) === prefix) {
                var lnum = parseInt(lyr.name.substring(prefix.length));
                if (lnum>=num) num = lnum+1;
            }
        }
        return prefix+num;
    }

    addRenderLayer(path) {
        var img = new Image();
        img.src = path;

        // Draw the image on the canvas when it finishes loading
        img.onload = () => {
            var cvs = new OffscreenCanvas(img.width, img.height);
            var ctx = cvs.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var name = this.createLayerName('render');
            var lyr = this.addLayer(cvs, name, this.layers.length-2);
            this.selectLayer(name);
            this.refreshLayerControl();
        }
    }

    combineLayers() {
        var l = 100000;
        var t = 100000;
        var r = -100000;
        var b = -100000;
        for(let lyr of this.layers) {
            if(lyr.name==='brush' || lyr.name==='mask' || !lyr.visible) continue;
            l = lyr.x < l ? lyr.x : l;
            t = lyr.y < t ? lyr.y : t;
            r = lyr.x + lyr.canvas.width > r ? lyr.x + lyr.canvas.width : r;
            b = lyr.y + lyr.canvas.height > b ? lyr.y + lyr.canvas.height : b;
        }
        var w = r-l;
        var h = b-t;
        
        if (w<=0 || h<=0) return;
        
        var cvs = new OffscreenCanvas(w, h);
        var ctx = cvs.getContext('2d');
        for(let lyr of this.layers) {
            if(lyr.name==='brush' || lyr.name==='mask' || !lyr.visible) continue;
            ctx.drawImage(lyr.canvas, lyr.x-l, lyr.y-t);
        }
        this.layers.splice(0, this.layers.length-2);
        
        var name = this.createLayerName('image');
        var lyr = this.addLayer(cvs, name, this.layers.length-2);
        lyr.x = l;
        lyr.y = t;
        
        this.selectLayer(name);
        this.refreshLayerControl();
    }

    deleteLayer() {
        if (this.currentLayer.name === 'brush' ||
            this.currentLayer.name === 'mask') {
            console.log('Brush or Mask layer cannot be deleted');
            return;
        }
        var idx = this.layers.findIndex((e) => e === this.currentLayer);
        this.layers.splice(idx, 1);
        this.selectLayerByIndex(Math.max(idx-1,0));
        this.refreshLayerControl();
    }

    clearLayer() {
        if (this.currentLayer.name==='mask' || this.currentLayer.name==='brush') {
            this.currentCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
        } else {
            this.deleteLayer()
        }
    }
    
    resizeLayerBy(lyr, dw, dh) {
        if (lyr.canvas.width+dw <= 0 || lyr.canvas.height+dh <= 0) return;
        // backup drawing
        var drawing = lyr.ctx.getImageData(0, 0, lyr.canvas.width, lyr.canvas.height);
        
        lyr.canvas.width += dw;
        lyr.canvas.height += dh;
        
        // restrore drawing
        lyr.canvas.ctx = lyr.canvas.getContext('2d');
        lyr.canvas.ctx.putImageData(drawing, 0, 0);
    }

    moveLayerUp() {
        if(this.layers.length<4) return; // only one movable layer
        var idx = this.findLayerIndexByName(this.currentLayer.name);
        if (idx >= this.layers.length-3) return; // cannot move further up
        [this.layers[idx], this.layers[idx+1]] = [this.layers[idx+1], this.layers[idx]];
        this.refreshLayerControl();
    }

    moveLayerDown() {
        if(this.layers.length<4) return; // only one movable layer
        var idx = this.findLayerIndexByName(this.currentLayer.name);
        if (idx === 0) return; // cannot move further down
        [this.layers[idx], this.layers[idx-1]] = [this.layers[idx-1], this.layers[idx]];
        this.refreshLayerControl();
    }

    toggleVisible() {
        this.currentLayer.visible = !this.currentLayer.visible;
        this.refreshLayerControl();
    }

    getLayerAtLocation(x, y) {
        for(var i=this.layers.length-3; i>=0; i--) {
            var lyr = this.layers[i];
            if (x>=lyr.x && y>=lyr.y && x<=lyr.x+lyr.canvas.width && y<=lyr.y+lyr.canvas.height)
                return lyr;
        }
        return null;
    }
    
    saveImage() {
        modelCtx.globalCompositeOperation = "source-over"
        modelCtx.clearRect(0, 0, modelCanvas.width, modelCanvas.height);
        for (let lyr of this.layers) {
            if (lyr.name === 'mask' || !lyr.visible)
                continue;
            modelCtx.drawImage(lyr.canvas, lyr.x, lyr.y);
        }
        var dataURL = modelCanvas.toDataURL();
        
        var formData = new FormData();
        formData.append('image', dataURL);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", 'save_image', true);
        xhr.onload = function () {
          if (xhr.status === 200) {
              console.log('Image saved!');
          } else {
            console.error('Error:', xhr);
          }
        };
        xhr.send(formData);
    }
}
