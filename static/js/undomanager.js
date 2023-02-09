// undomanager

class UndoManager {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
  }

  add(change) {
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(change);
    this.currentIndex = this.history.length - 1;
  }

  undo() {
    if (this.currentIndex >= 0) {
      this.history[this.currentIndex].undo();
      this.currentIndex--;
    }
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      this.history[this.currentIndex].redo();
    }
  }
}

class UndoChange {
  undo() {
  }

  redo() {
  }
}

class LayerMovedChange extends UndoChange {
    constructor(mlayer, fx, fy, tx, ty) {
        super();
        this.mlayer = mlayer;
        this.fx = fx;
        this.fy = fy;
        this.tx = tx;
        this.ty = ty;
    }
    
    undo() {
        this.mlayer.x = this.fx;
        this.mlayer.y = this.fy;
    }
    
    redo() {
        this.mlayer.x = this.tx;
        this.mlayer.y = this.ty;
    }
}
