

function Model(dae, tga){
	this.dae = dae;
	this.tex = tga;
	this.frameId = 0.0;
	this.modelMatrix = this.createModelMatrix();
	this.xRot = 270;
	this.loc = vec3(0,0,0);
	this.size = 1;
	this.animationTrackIndex = 0;
}

Model.prototype.createModelMatrix = function(){
	let minX = maxX = this.dae.vertexPositionDataRead[0];
	let minY = maxY = this.dae.vertexPositionDataRead[1];
	let minZ = maxZ = this.dae.vertexPositionDataRead[2];
	for(var i = 1; i < this.dae.vertexPositionDataRead.length/3; ++i){
		let x = this.dae.vertexPositionDataRead[i*3];
		let y = this.dae.vertexPositionDataRead[i*3+1];
		let z = this.dae.vertexPositionDataRead[i*3+2];

		if(x < minX){
			minX = x;
		}
		if( x > maxX){
			maxX = x;
		}
		if(y < minY){
			minY = y;
		}
		if( y > maxY){
			maxY = y;
		}
		if(z < minZ){
			minZ = z;
		}
		if( z > maxZ){
			maxZ = z;
		}
	}
	let scaleSize;
	const xSize = maxX - minX;
	const ySize = maxY - minY;
	const zSize = maxZ - minZ;
	// if(xSize > ySize && xSize > zSize){
	// 	scaleSize = 1.0/(xSize);	
	// } else if(ySize > xSize && ySize > zSize){
	// 	scaleSize = 1.0/(ySize);	
	// } else {
	// 	scaleSize = 1.0/(zSize);	
	// }
	scaleSize = 1.0/ySize;
	const centerX = minX + xSize/2;
	const centerY = minY + ySize/2;
	const centerZ = minZ + zSize/2;
	const s = scalem(scaleSize, scaleSize, scaleSize);
	const t = translate( -centerX, -centerY, -centerZ );
	const mat = mult(s, t);

	return mat;
}

Model.prototype.sendWorldMatrix = function(gl, program){
	const s = scalem(this.size, this.size, this.size);
	const r = rotate(this.xRot, [1,0,0]);
	const t = translate( this.loc[0], this.loc[1], this.loc[2] );
	const mat = mult(t, mult(r, s));
	gl.uniformMatrix4fv( gl.getUniformLocation(program, "worldMatrix"), gl.FALSE, flatten(mat));
}

// update skinning and draw matrix for every bone
// do this on CPU in Javascript
Model.prototype.updateSkeleton = function(){
	let jointMatrix;
	let jointMatrixNextFrame;
	let IBM;
	let SM;
	let SMNextFrame;
	let frameCount;

	for(var boneIdx = 0; boneIdx < this.dae.bones.length; ++boneIdx){
		let animationTrack = this.dae.bones[boneIdx].animationTracks[this.animationTrackIndex];
		if(!animationTrack){
			animationTrack = this.dae.bones[boneIdx].animationTracks[1];
		}
		frameCount = animationTrack.keyFrameTransform.length;
		this.frameId += 0.0009;
		if(this.frameId >= frameCount){
			this.frameId = 0;
		}

		let frameIdOne = Math.floor(this.frameId);
		let frameIdTwo = frameIdOne + 1;
		if(frameIdTwo >= frameCount){
			frameIdTwo = 0;
		}
		let lerpAmount = this.frameId - frameIdOne;
		if(lerpAmount > 1){
			lerpAmount = 0;
		}

		let bone = this.dae.bones[boneIdx];
		if(frameCount > 0){
			jointMatrix = this.calJointMatrix4Bone(bone, 1, frameIdOne%frameCount);
			jointMatrixNextFrame = this.calJointMatrix4Bone(bone, 1, frameIdTwo%frameCount);
		} else {
			jointMatrix = this.calJointMatrix4Bone(bone, 1, -1);
			jointMatrixNextFrame = this.calJointMatrix4Bone(bone, 1, -1);
		}

		IBM = this.dae.bones[boneIdx].inverseBindMatrix;
		this.dae.bones[boneIdx].jointMatrix = jointMatrix;
		this.dae.bones[boneIdx].jointMatrixNextFrame = jointMatrixNextFrame;
		SM = mult(jointMatrix, IBM);
		this.dae.bones[boneIdx].skinningMatrix = SM;
		SMNextFrame = mult(jointMatrixNextFrame, IBM);
		this.dae.bones[boneIdx].skinningMatrixNextFrame = SMNextFrame;
		this.dae.lerpAmount = lerpAmount;
	}
}

Model.prototype.calJointMatrix4Bone = function(bone, trackIdx, frameIdx){
	let jointMatrix;

	if(bone.animationTracks[trackIdx].keyFrameTransform.length == 0 || 
		frameIdx >= bone.animationTracks[trackIdx].keyFrameTransform.length){
		jointMatrix = bone.bindPoseMatrix;
	} else {
		jointMatrix = bone.animationTracks[trackIdx].keyFrameTransform[frameIdx];
	}

	if(bone.parent == null){
		return jointMatrix;
	}
	else {
		const parentJointMatrix = this.calJointMatrix4Bone(bone.parent, trackIdx, frameIdx);
		jointMatrix = mult( parentJointMatrix, jointMatrix );
		return jointMatrix;
	}
}

Model.prototype.pushBoneMatrixArray = function(gl, program){
	this.updateSkeleton();
	
	for(var i = 0; i < this.dae.bones.length; ++i){
		const bMLoc = gl.getUniformLocation( program, "boneMatrices["+i+"]");
		const bMNfLoc = gl.getUniformLocation( program, "boneMatricesNF["+i+"]");
		gl.uniformMatrix4fv(bMLoc, false, flatten(this.dae.bones[i].skinningMatrix));
		gl.uniformMatrix4fv(bMNfLoc, false, flatten(this.dae.bones[i].skinningMatrixNextFrame));
	}
}

Model.prototype.pushLerpAmount = function(gl, program){
	const loc = gl.getUniformLocation(program, "lerpAmount");
	gl.uniform1f(loc, this.dae.lerpAmount);	
}

Model.prototype.render = function(gl, program, attributes){
	colladaParser_MakeVertexDataCopy(this.dae);	

	this.pushBoneMatrixArray(gl, program);
	this.pushLerpAmount(gl, program);
	gl.uniformMatrix4fv( gl.getUniformLocation(program, "modelMatrix"), gl.FALSE, flatten(this.modelMatrix));
	this.sendWorldMatrix(gl, program);

	gl.bindBuffer( gl.ARRAY_BUFFER, attributes.vertexPositions.id );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(this.dae.vertexPositionDataRead), gl.STATIC_DRAW );
	const vPos = gl.getAttribLocation( program, "vPos" );
	gl.enableVertexAttribArray( vPos );
	gl.vertexAttribPointer( vPos, 3, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, attributes.vertexTextures.id );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(this.dae.vertexTextureDataRead), gl.STATIC_DRAW );	
	const vTex = gl.getAttribLocation( program, "vTex" );
	gl.enableVertexAttribArray( vTex );
	gl.vertexAttribPointer( vTex, 2, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, attributes.boneIndices.id );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(this.dae.vertexBoneIndexDataRead), gl.STATIC_DRAW );	
	const bIndices = gl.getAttribLocation( program, "bIndices" );
	gl.enableVertexAttribArray( bIndices );
	gl.vertexAttribPointer( bIndices, 4, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, attributes.boneWeights.id );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(this.dae.vertexBoneWeightDataRead), gl.STATIC_DRAW );	
	const bWeights = gl.getAttribLocation( program, "bWeights" );
	gl.enableVertexAttribArray( bWeights );
	gl.vertexAttribPointer( bWeights, 4, gl.FLOAT, false, 0, 0 );

	gl.bindTexture(gl.TEXTURE_2D, this.tex.texture);

	gl.drawArrays( gl.TRIANGLES, this.dae.subMeshIndex[0], this.dae.subMeshIndex[1]); //Draw a single triangle (3 points)
}