

function Model(dae, tga){
	this.dae = dae;
	this.tex = tga;
	this.frameId = 0.0;
	this.modelMatrix = this.createModelMatrix();
	this.xRot = 270;
	this.loc = vec3(0,0,0);
	this.size = 1;


}

Model.prototype.createModelMatrix = function(){
	//Scale the model and center it based on its bounding sphere
	// var scaleSize = 1.0/this.dae.radius;	
	// console.log("radius: " + this.dae.radius);
	// console.log("center: " + this.dae.center);

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
	console.log("minX: " + minX + " | maxX: " + maxX +
			"\nminY: " + minY + " | maxY: " + maxY +
			"\nminZ: " + minZ + " | maxZ: " + maxZ);
	var scaleSize;
	var xSize = maxX - minX;
	var ySize = maxY - minY;
	var zSize = maxZ - minZ;
	// if(xSize > ySize && xSize > zSize){
	// 	scaleSize = 1.0/(xSize);	
	// } else if(ySize > xSize && ySize > zSize){
	// 	scaleSize = 1.0/(ySize);	
	// } else {
	// 	scaleSize = 1.0/(zSize);	
	// }
	scaleSize = 1.0/ySize;
	let centerX = minX + xSize/2;
	let centerY = minY + ySize/2;
	let centerZ = minZ + zSize/2;
	let s = scalem(scaleSize, scaleSize, scaleSize);
	let t = translate( -centerX, -centerY, -centerZ );
	let mat = mult(s, t);


	let min = vec4(this.dae.vertexPositionDataRead[0], 
		this.dae.vertexPositionDataRead[1], this.dae.vertexPositionDataRead[2], 0);
	min = multiplyMat4Vec4(mat, min);
	let max = vec4(this.dae.vertexPositionDataRead[0], 
		this.dae.vertexPositionDataRead[1], this.dae.vertexPositionDataRead[2], 0);
	max = multiplyMat4Vec4(mat, max);
	for(var i = 1; i < this.dae.vertexPositionDataRead.length/3; ++i){
		let cur = vec4(this.dae.vertexPositionDataRead[i*3],
			this.dae.vertexPositionDataRead[i*3+1],
			this.dae.vertexPositionDataRead[i*3+2], 0);
		let curT = multiplyMat4Vec4(mat, cur);

		if(curT[0] < min[0]){
			min[0] = curT[0];
		}
		if( curT[0] > max[0]){
			max[0] = curT[0];
		}
		if(curT[1] < min[1]){
			min[1] = curT[1];
		}
		if( curT[1] > max[1]){
			max[1] = curT[1];
		}
		if(curT[2] < min[2]){
			min[2] = curT[2];
		}
		if( curT[2] > max[2]){
			max[2] = curT[2];
		}
	}
	console.log("minX: " + min[0] + " | maxX: " + max[0] +
			"\nminY: " + min[1] + " | maxY: " + max[1] +
			"\nminZ: " + min[2] + " | maxZ: " + max[2]);

	return mat;
}

Model.prototype.sendWorldMatrix = function(gl, program){
	let s = scalem(this.size, this.size, this.size);
	let r = rotate(this.xRot, [1,0,0]);
	let t = translate( this.loc[0], this.loc[1], this.loc[2] );
	let mat = mult(t, mult(r, s));
	gl.uniformMatrix4fv( gl.getUniformLocation(program, "worldMatrix"), gl.FALSE, flatten(mat));
}

// update skinning and draw matrix for every bone
// do this on CPU in Javascript
Model.prototype.updateSkeleton = function(){
	var jointMatrix;
	var jointMatrixNextFrame;
	var IBM;
	var SM;
	var SMNextFrame;
	var frameCount;

	for(var boneIdx = 0; boneIdx < this.dae.bones.length; ++boneIdx){
		frameCount = this.dae.bones[boneIdx].animationTracks[1].keyFrameTransform.length;
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
	var jointMatrix;

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
		var parentJointMatrix = this.calJointMatrix4Bone(bone.parent, trackIdx, frameIdx);
		jointMatrix = mult( parentJointMatrix, jointMatrix );
		return jointMatrix;
	}
}

Model.prototype.pushBoneMatrixArray = function(gl, program){
	this.updateSkeleton();
	
	for(var i = 0; i < this.dae.bones.length; ++i){
		var bMLoc = gl.getUniformLocation( program, "boneMatrices["+i+"]");
		var bMNfLoc = gl.getUniformLocation( program, "boneMatricesNextFrame["+i+"]");
		gl.uniformMatrix4fv(bMLoc, false, flatten(this.dae.bones[i].skinningMatrix));
		gl.uniformMatrix4fv(bMNfLoc, false, flatten(this.dae.bones[i].skinningMatrixNextFrame));
	}
}

Model.prototype.pushLerpAmount = function(gl, program){
	let loc = gl.getUniformLocation(program, "lerpAmount");
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
	var aPosition = gl.getAttribLocation( program, "aPosition" );
	gl.enableVertexAttribArray( aPosition );
	gl.vertexAttribPointer( aPosition, 3, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, attributes.vertexTextures.id );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(this.dae.vertexTextureDataRead), gl.STATIC_DRAW );	
	var aTexture = gl.getAttribLocation( program, "aTexture" );
	gl.enableVertexAttribArray( aTexture );
	gl.vertexAttribPointer( aTexture, 2, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, attributes.boneIndices.id );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(this.dae.vertexBoneIndexDataRead), gl.STATIC_DRAW );	
	var boneIndex = gl.getAttribLocation( program, "boneIndex" );
	gl.enableVertexAttribArray( boneIndex );
	gl.vertexAttribPointer( boneIndex, 4, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, attributes.boneWeights.id );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(this.dae.vertexBoneWeightDataRead), gl.STATIC_DRAW );	
	var boneWeight = gl.getAttribLocation( program, "boneWeight" );
	gl.enableVertexAttribArray( boneWeight );
	gl.vertexAttribPointer( boneWeight, 4, gl.FLOAT, false, 0, 0 );

	//Set the texture for the model
	gl.bindTexture(gl.TEXTURE_2D, this.tex.texture);
	// console.log(this.tex.texture);
	
	//Draw the entire model in one go. 
	gl.drawArrays( gl.TRIANGLES, this.dae.subMeshIndex[0], this.dae.subMeshIndex[1]); //Draw a single triangle (3 points)
}