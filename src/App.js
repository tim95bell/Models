

function App(){

	//--------------------- Set Up WebGL ---------------------//
    this.canvas = document.getElementById( "gl-canvas" );

    this.gl = WebGLUtils.setupWebGL( this.canvas );
	if ( !this.gl ) { alert( "WebGL isn't available" ); }

	this.gl.viewport( 0, 0, this.canvas.width, this.canvas.height );
    this.gl.clearColor( 0.7, 0.4, 0.3, 1.0 );
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

	// this.goblinModel1 = new Model(goblinDae, goblinTga);
	// this.goblinModel1.size = 0.5
	// this.goblinModel1.loc[0] = -10;
	// this.goblinModel1.loc[1] = -14;
	// this.goblinModel1.loc[2] = -20;

	// this.goblinModel2 = new Model(goblinDae, goblinTga);
	// this.goblinModel2.size = 0.5
	// this.goblinModel2.loc[0] = 0;
	// this.goblinModel2.loc[1] = -14;
	// this.goblinModel2.loc[2] = -20;

	// this.goblinModel3 = new Model(goblinDae, goblinTga);
	// this.goblinModel3.size = 0.5
	// this.goblinModel3.loc[0] = 10;
	// this.goblinModel3.loc[1] = -14;
	// this.goblinModel3.loc[2] = -20;
	//////////////////////////////////////////////////////
	this.rectModel1 = new Model(goblinDae, goblinTga);
	this.rectModel1.size = 0.5
	this.rectModel1.loc[0] = -10;
	this.rectModel1.loc[1] = 0;
	this.rectModel1.loc[2] = -20;

	this.rectModel2 = new Model(rectangleDae, rectangleTga);
	this.rectModel2.size = 3.0;
	this.rectModel2.loc[0] = 0;
	this.rectModel2.loc[1] = 4;
	this.rectModel2.loc[2] = -20;

	this.rectModel3 = new Model(rectangleDae, rectangleTga);
	this.rectModel3.size = 3.0
	this.rectModel3.loc[0] = 10;
	this.rectModel3.loc[1] = 4;
	this.rectModel3.loc[2] = -20;
	//////////////////////////////////////////////////////
	// this.catModel1 = new Model(goblinDae, goblinTga);
	// this.catModel1.size = 0.5
	// this.catModel1.loc[0] = -10;
	// this.catModel1.loc[1] = 14;
	// this.catModel1.loc[2] = -20;

	// this.catModel2 = new Model(goblinDae, goblinTga);
	// this.catModel2.size = 0.5
	// this.catModel2.loc[0] = 0;
	// this.catModel2.loc[1] = 14;
	// this.catModel2.loc[2] = -20;

	// this.catModel3 = new Model(goblinDae, goblinTga);
	// this.catModel3.size = 0.5
	// this.catModel3.loc[0] = 10;
	// this.catModel3.loc[1] = 14;
	// this.catModel3.loc[2] = -20;
	

	//--------------------- Load Shaders ---------------------//
    this.program = initShaders( this.gl, "src/shaders/BasicShader.vs",
                               "src/shaders/BasicShader.fs" );
	this.gl.useProgram( this.program );
	

	//--------------------- Set Up Attributes ---------------------//
	// vertexPositions
	this.attributes.vertexPositions.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.vertexPositions.id );
	// this.gl.bufferData( this.gl.ARRAY_BUFFER, flatten(this.attributes.vertexPositions.val), this.gl.STATIC_DRAW );
	// aPosition
	var aPosition = this.gl.getAttribLocation( this.program, "aPosition" );
	this.gl.enableVertexAttribArray( aPosition );
	this.gl.vertexAttribPointer( aPosition, 3, this.gl.FLOAT, false, 0, 0 );

	// vertexTextures
	this.attributes.vertexTextures.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.vertexTextures.id );
	// this.gl.bufferData( this.gl.ARRAY_BUFFER, flatten(this.attributes.vertexTextures.val), this.gl.STATIC_DRAW );	
	// aTexture
	var aTexture = this.gl.getAttribLocation( this.program, "aTexture" );
	this.gl.enableVertexAttribArray( aTexture );
	this.gl.vertexAttribPointer( aTexture, 2, this.gl.FLOAT, false, 0, 0 );

	// boneIndices
	this.attributes.boneIndices.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.boneIndices.id );
	// this.gl.bufferData( this.gl.ARRAY_BUFFER, flatten(this.attributes.boneIndices.val), this.gl.STATIC_DRAW );	
	// boneIndex
	var boneIndex = this.gl.getAttribLocation( this.program, "boneIndex" );
	this.gl.enableVertexAttribArray( boneIndex );
	this.gl.vertexAttribPointer( boneIndex, 4, this.gl.FLOAT, false, 0, 0 );

	// boneWeights
	this.attributes.boneWeights.id = this.gl.createBuffer();
	this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.attributes.boneWeights.id );
	// this.gl.bufferData( this.gl.ARRAY_BUFFER, flatten(this.attributes.boneWeights.val), this.gl.STATIC_DRAW );	
	// boneWeight
	var boneWeight = this.gl.getAttribLocation( this.program, "boneWeight" );
	this.gl.enableVertexAttribArray( boneWeight );
	this.gl.vertexAttribPointer( boneWeight, 4, this.gl.FLOAT, false, 0, 0 );
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
	// viewProjectionMatrix = mult( p, mult( t, r ) );
}
// App.prototype.updateviewProjectionMatrix = function(){
// 	let p = perspective(45,1,0.1,1000);
// 	let t = translate(-0.4,-0.7,-5);
// 	let r = rotate(270, [1,0,0]);
// 	let lA = lookAt(vec3(40,10,50),vec3(0,0,0),vec3(0,1,0));
// 	this.viewProjectionMatrix = mult( p, mult( lA, mult( t, r ) ) );
// 	// viewProjectionMatrix = mult( p, mult( t, r ) );
// }

App.prototype.render = function()
{
	this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, "uSampler"), 0);
	this.gl.clear( this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT );


	// this.goblinModel1.render(this.gl, this.program);
	// this.goblinModel2.render(this.gl, this.program);
	// this.goblinModel3.render(this.gl, this.program);

	this.rectModel1.render(this.gl, this.program, this.attributes);
	this.rectModel2.render(this.gl, this.program, this.attributes);
	this.rectModel3.render(this.gl, this.program, this.attributes);

	// this.catModel1.render(this.gl, this.program);
	// this.catModel2.render(this.gl, this.program);
	// this.catModel3.render(this.gl, this.program);
}

App.prototype.run = function(){
	window.requestAnimationFrame( this.run.bind(this), this.canvas);
	this.update();
	this.render();
}