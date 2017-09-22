

function App(){

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
	// const catDaePath = "assets/meshes/cat.dae";
	const rectangleDaePath = "assets/meshes/AnimatedRectanglev2.dae";
	const goblinTgaPath = "assets/textures/goblintexture.tga";
	// const catTgaPath = "assets/textures/cat.tga"
	const rectangleTgaPath = "Assets/textures/AnimatedRectangle.tga";

	const goblinTga = new TGAParser(this.gl, goblinTgaPath);
	const rectangleDae = this.createDae(rectangleDaePath);
	const goblinDae = this.createDae(goblinDaePath);
	const rectangleTga = new TGAParser(this.gl, rectangleTgaPath);

	const goblinRatio = 1;
	const rectRatio = 6;
	const catRatio = 6;
	const size = 0.4;

	this.goblins = [];
	this.rects = [];
	this.cats = [];

	const gap = 13;

	for(var i = 0; i < 3; ++i){
		this.goblins[i] = new Model(goblinDae, goblinTga);
		this.goblins[i].size = size*goblinRatio;
		this.goblins[i].loc = vec3( (i - 1)*gap, gap/3*2, -gap*4);
		this.goblins[i].animationTrackIndex = i;
	}
	for(var i = 0; i < 3; ++i){
		this.rects[i] = new Model(rectangleDae, rectangleTga);
		this.rects[i].size = size*rectRatio;
		this.rects[i].loc = vec3( (i - 1)*gap, 0, -gap*3);
		this.rects[i].animationTrackIndex = i;
	}
	for(var i = 0; i < 3; ++i){
		this.cats[i] = new Model(rectangleDae, rectangleTga);
		this.cats[i].size = size*catRatio;
		this.cats[i].loc = vec3( (i - 1)*gap, -gap/6*5, -gap*2);
		this.cats[i].animationTrackIndex = i;
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
};

App.prototype.createDae = function(path){
	let dae = new ColladaParser(path);

	return dae;
}

App.prototype.update = function(){
	this.updateviewProjectionMatrix()
}

App.prototype.updateviewProjectionMatrix = function(){
	let p = perspective(45,1,0.1,1000);
	let lA = lookAt(vec3(0,0,20),vec3(0,0,0),vec3(0,1,0));
	this.viewProjectionMatrix = mult(p, lA);
	
	this.gl.uniformMatrix4fv( this.gl.getUniformLocation(this.program, "viewProjectionMatrix"), this.gl.FALSE, flatten(this.viewProjectionMatrix) );
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
	console.log("down: " + keyEvent.key);
}

App.prototype.keyUp = function(keyEvent){
	console.log("up: " + keyEvent.key);
}