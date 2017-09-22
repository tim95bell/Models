let app;

window.onload = function init(){
	window.addEventListener("keydown", function(e){ keyDown(e); });
    window.addEventListener("keyup", function(e){ keyUp(e); });

    app = new App();
    app.run();
}

function keyDown(keyEvent){
    app.keyDown(keyEvent);
}

function keyUp(keyEvent){
    app.keyUp(keyEvent);
}