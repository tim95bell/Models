

function App(){
	this.playback = {
		speed : 1.0,
		paused : false
	};
	this.tracks = {
		inTransition : false,
		time : null,
		endTime : null
	};
	this.movement = {
		lookAround : false,
		left : false,
		down : false,
		right : false,
		up : false
	};
	this.picking = {
		enabled : false,
		object : null	
	};
	this.oneView = {
		eye : vec3(0, 0, 20),
		camYaw : 180,
		camPitch : 0,
		up : vec3(0, 1, 0)
	};
	this.twoView = {
		eye : vec3(0.1, 60, -35),
		camYaw : 180,
		camPitch : -85,
		up : vec3(0, 1, 0)
	};
	this.view = {
		eye : vec3(0, 0, 20),
		camYaw : 180,
		camPitch : 0,
		up : vec3(0, 1, 0)
	};

	//--------------------- Set Up WebGL ---------------------//
	this.canvas = document.getElementById( "gl-canvas" );

    this.gl = WebGLUtils.setupWebGL( this.canvas );
	if ( !this.gl ) { alert( "WebGL isn't available" ); }

	this.gl.viewport( 0, 0, this.canvas.width, this.canvas.height );
    this.gl.clearColor( 0.75, 0.5, 0.6, 1.0 );
	this.gl.enable(this.gl.DEPTH_TEST);
	

	//--------------------- Set Up Models ---------------------//
	this.attributes = {
		vertexPositions : new Attribute(),
		vertexTextures : new Attribute(),
		boneIndices : new Attribute(),
		boneWeights : new Attribute()
	};

	const goblinDaePath = "assets/meshes/goblin.dae";
	const catDaePath = "assets/meshes/cat.dae";
	const rectangleDaePath = "assets/meshes/AnimatedRectanglev2.dae";

	const goblinTgaPath = "assets/textures/goblintexture.tga";
	const rectangleTgaPath = "Assets/textures/AnimatedRectangle.tga";

	const goblinTga = new TGAParser(this.gl, goblinTgaPath);
	const rectangleTga = new TGAParser(this.gl, rectangleTgaPath);

	// const goblinDae = this.createDae(goblinDaePath);
	// const rectangleDae = this.createDae(rectangleDaePath);

	const goblinRatio = 1;
	const rectRatio = 6;
	const catRatio = 0.001;
	const size = 0.4;

	this.goblins = [];
	this.rects = [];
	this.cats = [];

	const gap = 13;

	for(var i = 0; i < 3; ++i){
		let dae = new ColladaParser(goblinDaePath);
		this.goblins[i] = new Model(dae, goblinTga, i);
		this.goblins[i].size = size*goblinRatio;
		this.goblins[i].loc = vec3( (i - 1)*gap, gap/3*2, -gap*4);
	}
	for(var i = 0; i < 3; ++i){
		let dae = new ColladaParser(rectangleDaePath);
		this.rects[i] = new Model(dae, rectangleTga, i);
		this.rects[i].size = size*rectRatio;
		this.rects[i].loc = vec3( (i - 1)*gap, 0, -gap*3);
	}
	for(var i = 0; i < 3; ++i){
		let dae = new ColladaParser(catDaePath);
		this.cats[i] = new Model(dae, rectangleTga, i);
		this.cats[i].size = size*catRatio;
		this.cats[i].loc = vec3( (i - 1)*gap, -gap/6*5, -gap*2);
		this.cats[i].xRot = 180;
	}


	//--------------------- Load Shaders ---------------------//
    this.program = initShaders( this.gl, "src/shaders/shader.vs",
                               "src/shaders/shader.fs" );
	this.gl.useProgram( this.program );
	

	//--------------------- Set Up Attributes ---------------------//
	// vertexPositions
	this.attributes.vertexPositions.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.vertexPositions.id );
	// vertexTextures
	this.attributes.vertexTextures.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.vertexTextures.id );
	// boneIndices
	this.attributes.boneIndices.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.boneIndices.id );
	// boneWeights
	this.attributes.boneWeights.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.boneWeights.id );


	//--------------------- Uniforms ---------------------//
	this.projMat = perspective(45,1,0.1,1000);
	this.gl.uniformMatrix4fv( this.gl.getUniformLocation(this.program, "projMat"), this.gl.FALSE, flatten(this.projMat) );
};

App.prototype.updateViewMat = function(){
    let yawInRadians = (this.view.camYaw / 180.0 * 3.141592654); 
    let pitchInRadians = (this.view.camPitch / 180.0 * 3.141592654); 

	let dir = vec3(0,0,0);
    dir[0] = Math.cos(pitchInRadians) * Math.sin(-yawInRadians); 
    dir[1] = Math.sin(pitchInRadians); 
	dir[2] = Math.cos(pitchInRadians) * Math.cos(-yawInRadians);

	this.viewMat = lookAt(this.view.eye, add(this.view.eye, dir), this.view.up);
	
	this.gl.uniformMatrix4fv( this.gl.getUniformLocation(this.program, "viewMat"), this.gl.FALSE, flatten(this.viewMat) );
}

App.prototype.enterLookAroundMode = function(){
	this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
	this.canvas.requestPointerLock();
	this.movement.lookAround = true;
}

App.prototype.move = function(){
    let yawInRadians = (this.view.camYaw / 180.0 * 3.141592654); 
    let pitchInRadians = (this.view.camPitch / 180.0 * 3.141592654); 
	let dir = vec3(0,0,0);
    dir[0] = Math.cos(pitchInRadians) * Math.sin(-yawInRadians); 
    dir[1] = Math.sin(pitchInRadians); 
	dir[2] = Math.cos(pitchInRadians) * Math.cos(-yawInRadians);

	if(this.movement.up && !this.movement.down){
		let add = normaliseVector(dir);
		multiplyPoint(add, 0.001);
		this.view.eye = addPoints(this.view.eye, add);
	} else if(this.movement.down && !this.movement.up){
		let add = normaliseVector(dir);
		multiplyPoint(add, 0.001);
		this.view.eye = subtractPoints(this.view.eye, add);
	}
	if(this.movement.left && !this.movement.right){
		let add = cross(this.view.up, dir);
		add = normaliseVector(add);
		multiplyPoint(add, 0.001);
		this.view.eye = addPoints(this.view.eye, add);
	} else if(this.movement.right && !this.movement.left){
		let add = cross(this.view.up, dir);
		add = normaliseVector(add);
		multiplyPoint(add, 0.001);
		this.view.eye = subtractPoints(this.view.eye, add);
	}
}

App.prototype.update = function(){
	this.updateViewMat()
	if(!this.playback.paused){
		for(var i = 0; i < 3; ++i){
			this.goblins[i].update(this.gl, this.program, false);
			this.cats[i].update(this.gl, this.program, false);
			this.rects[i].update(this.gl, this.program, false);
		}
	}
	this.move();
}

App.prototype.render = function()
{
	this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, "sampler"), 0);
	this.gl.clear( this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT );

	for(var i = 0; i < 3; ++i){
		this.goblins[i].render(this.gl, this.program, this.attributes);
		this.cats[i].render(this.gl, this.program, this.attributes);
		this.rects[i].render(this.gl, this.program, this.attributes);
	}
}

App.prototype.run = function(){
	window.requestAnimationFrame( this.run.bind(this), this.canvas);
	this.update();
	this.render();
}

App.prototype.keyDown = function(keyEvent){
	const key = keyEvent.key;
	switch(key){
		case '-':
		{
			const newSpeed = this.playback.speed / 2.0;
			this.playback.speed = newSpeed;
			for(var i = 0; i < 3; ++i){
				this.goblins[i].setPlaybackSpeed(newSpeed);
				this.cats[i].setPlaybackSpeed(newSpeed);
				this.rects[i].setPlaybackSpeed(newSpeed);
			}
		} break;
		case '+':
		{
			const newSpeed = this.playback.speed * 2.0;
			this.playback.speed = newSpeed;
			for(var i = 0; i < 3; ++i){
				this.goblins[i].setPlaybackSpeed(newSpeed);
				this.cats[i].setPlaybackSpeed(newSpeed);
				this.rects[i].setPlaybackSpeed(newSpeed);
			}
		} break;
		case 'x':
		{
			this.tracks.inTransition = true;
			this.tracks.time = Date.now();
			this.tracks.endTime = this.tracks.time + 2000;
			for(var i = 0; i < 3; ++i){
				// this.goblins[i].initiateTransitionForward(this.gl, this.program);
				// this.cats[i].initiateTransitionForward(this.gl, this.program);
				// this.rects[i].initiateTransitionForward(this.gl, this.program);
			}
		} break;
		case 'z':
		{
			this.tracks.inTransition = true;
			this.tracks.time = Date.now();
			this.tracks.endTime = this.tracks.time + 2000;
			for(var i = 0; i < 3; ++i){
				// this.goblins[i].initiateTransitionBackward(this.gl, this.program);
				// this.cats[i].initiateTransitionBackward(this.gl, this.program);
				// this.rects[i].initiateTransitionBackward(this.gl, this.program);
			}
		} break;
		case 'p':
		{
			this.playback.paused = !this.playback.paused;
		} break;
		case 'c':
		{
			if(!this.movement.lookAround){
				this.picking.enabled = !this.picking.enabled;
			}
		} break;
		case '1':
		{
			this.view.eye = this.oneView.eye;
			this.view.camPitch = this.oneView.camPitch;
			this.view.camYaw = this.oneView.camYaw;
			this.view.up = this.oneView.up;
		} break;
		case '2':
		{
			this.view.eye = this.twoView.eye;
			this.view.camPitch = this.twoView.camPitch;
			this.view.camYaw = this.twoView.camYaw;
			this.view.up = this.twoView.up;
		} break;
		case 'w':
		{
			this.movement.up = true;
		} break;
		case 'a':
		{
			this.movement.left = true;
		} break;
		case 's':
		{
			this.movement.down = true;
		} break;
		case 'd':
		{
			this.movement.right = true;
		} break;
	}
}

App.prototype.keyUp = function(keyEvent){
	let key = keyEvent.key;
	switch(key){
		case 'w':
		{
			this.movement.up = false;
		} break;
		case 'a':
		{
			this.movement.left = false;
		} break;
		case 's':
		{
			this.movement.down = false;
		} break;
		case 'd':
		{
			this.movement.right = false;
		} break;
	}
}

App.prototype.onClick = function(event){
	if(!this.picking.enabled){
		this.enterLookAroundMode();
	}
}

App.prototype.onMouseMove = function(e){
	if(this.movement.lookAround){
		let movementX = event.movementX || event.mozMovementX || 
			event.webkitMovementX || 0;
		let movementY = event.movementY || event.mozMovementY || 
			event.webkitMovementY || 0;
		this.view.camYaw += movementX*0.05;
		this.view.camPitch += -movementY*0.05;  
		if(this.view.camPitch <= -90){
			this.view.camPitch = -89.99;
		} else if(this.view.camPitch >= 90){
			this.view.camPitch = 89.99;
		}
	}
	else if(this.picking.enabled){

	}
}

App.prototype.onMouseDown = function(event){
	if(this.picking.enabled && !this.movement.lookAround){
		let x = event.clientX;
		let y = event.clientY;
		let mat = mult(this.projMat, this.viewMat);
		let p1 = unproject(x, y, 0, mat, [0, 0, this.canvas.width, this.canvas.height]);
		let p2 = unproject(x, y, 1, mat, [0, 0, this.canvas.width, this.canvas.height]);

		for(var i = 0; i < 3; ++i){
			// goblin[i]
			{
				let goblin_i = this.goblins[i];
				let goblin_i_boundingSphere = goblin_i.getWorldSpaceBoundingSphere();
				let c = goblin_i_boundingSphere.c;
				let r = goblin_i_boundingSphere.r;
				if(this.checkCollision(p1, p2, c, r)){
					this.picking.object = goblin_i;
					break;
				}
			}
			// cats[i]
			{
				let cats_i = this.cats[i];
				let cats_i_boundingSphere = cats_i.getWorldSpaceBoundingSphere();
				let c = cats_i_boundingSphere.c;
				let r = cats_i_boundingSphere.r;
				if(this.checkCollision(p1, p2, c, r)){
					this.picking.object = cats_i;
					break;
				}
			}
			// rects[i]
			{
				let rects_i = this.rects[i];
				let rects_i_boundingSphere = rects_i.getWorldSpaceBoundingSphere();
				let c = rects_i_boundingSphere.c;
				let r = rects_i_boundingSphere.r;
				if(this.checkCollision(p1, p2, c, r)){
					this.picking.object = rects_i;
					break;
				}
			}
		}
		console.log("pickingObject: " + this.picking.object);
	}
}
App.prototype.checkCollision = function(p1, p2, c, r){
	let pc = subtractPoints(p1, c);
	let p12 = subtractPoints(p2, p1);
	let pq_direction = dotProduct(pc, p12)/Math.sqrt(dotProduct(p12, p12));
	let pq = scale(pq_direction, addPoints(p12, p1));
	let pq_to_c = subtractPoints(c, pq);


	pq_to_c_length = length(pq_to_c);

	console.log("c: " + c + "\nr: " + r + "\np1: " + p1 + 
		"\np2: " + p2 + "\npq: " + pq + "\npq_to_c_length: " + pq_to_c_length);

	if(pq_to_c_length < r){
		return true;
	} else {
		return false;
	}
}

function toEyeCoords(clipCoords, projMat){
	let iProjMat = inverse(projMat);
	let eyeCoords = multiplyMat4Vec4(iProjMat, clipCoords);
	eyeCoords[2] = -1;
	eyeCoords[3] = 0;
	return eyeCoords;
}

function toWorldCoords(eyeCoords, viewMat){
	let iViewMat = inverse(viewMat);
	let rayWorld = multiplyMat4Vec4(iViewMat, eyeCoords);
	let mouseRay = vec3(rayWorld[0], rayWorld[1], rayWorld[2]);
	mouseRay = normaliseVector(mouseRay);
	return mouseRay;
}

App.prototype.onMouseUp = function(event){
	this.picking.object = null;
}

App.prototype.pointerLockChange = function(event){
	if(document.pointerLockElement === this.canvas ||
		document.mozPointerLockElement === this.canvas){

	} else {
		this.movement.lookAround = false;
	}
}