let app;

window.onload = function init(){
    app = new App();

	window.addEventListener("keydown", function(e){ app.keyDown(e); });
    window.addEventListener("keyup", function(e){ app.keyUp(e); });
    window.addEventListener("click", function(e){ app.onClick(event); });
    window.addEventListener("mousemove", function(e){ app.onMouseMove(event); });
    window.addEventListener("mousedown", function(e){ app.onMouseDown(event); });
    window.addEventListener("mouseup", function(e){ app.onMouseUp(event); });
    document.addEventListener("pointerlockchange", pointerLockChange, false);
    document.addEventListener("mozpointerlockchange", pointerLockChange, false);
    document.addEventListener("webkitpointerlockchange", pointerLockChange, false);

    app.run();
}

function pointerLockChange(e){
    app.pointerLockChange(e);
}