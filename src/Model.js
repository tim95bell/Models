

function Model(dae, tga, trackIndex){
	this.dae = dae;
	this.tex = tga;

	this.currentTrack = {
		lerpAmount : 0.0,
		frameId : 0.0,
		trackIndex : trackIndex
	};
	this.initializeBoneCurrentTrack();
	// this.nextTrack = {
	// 	lerpAmount : 0.0,
	// 	frameId : 0.0,
	// 	trackIndex : 0.0
	// };

	// this.radius
	// this.center
	this.modelMatrix = this.createModelMatrix();
	this.xRot = 270;
	this.loc = vec3(0,0,0);
	this.size = 1;
	this.animationTrackIndex = 0;
	this.playbackSpeed = 1.0;
	this.updateSkeleton();
}

Model.prototype.initializeBoneCurrentTrack = function(){
	for(var boneIdx = 0; boneIdx < this.dae.bones.length; ++boneIdx){
		let bone = this.dae.bones[boneIdx];

		let info = this.updateSkeletonBone(bone, this.currentTrack.frameId, this.currentTrack.trackIndex);
		bone.jointMatrix = info.jointMatrix;
		bone.jointMatrixNF = info.jointMatrixNF;
		bone.skinningMatrix = info.skinningMatrix;
		bone.skinningMatrixNF = info.skinningMatrixNF;
		this.currentTrack.lerpAmount = info.lerpAmount;
	}
}

Model.prototype.initializeBoneNextTrack = function(){
	for(var boneIdx = 0; boneIdx < this.dae.bones.length; ++boneIdx){
		let bone = this.dae.bones[boneIdx];

		let info = this.updateSkeletonBone(bone, this.currentTrack.frameId, this.currentTrack.trackIndex);
		bone.ntJointMatrix = info.jointMatrix;
		bone.ntJointMatrixNF = info.jointMatrixNF;
		bone.ntSkinningMatrix = info.skinningMatrix;
		bone.ntSkinningMatrixNF = info.skinningMatrixNF;
		this.nextTrack.lerpAmount = info.lerpAmount;
	}
}

Model.prototype.setPlaybackSpeed = function(val){
	this.playbackSpeed = val;
}

Model.prototype.getWorldSpaceBoundingSphere = function(){
	let worldRadius = this.modelRadius * this.size;
	let worldCenter = multiplyMat4Vec4(this.worldMatrix, multiplyMat4Vec4(this.modelMatrix, this.center));
	return {c: worldCenter, r: worldRadius};
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
	scaleSize = 1.0/ySize;
	const centerX = minX + xSize/2;
	const centerY = minY + ySize/2;
	const centerZ = minZ + zSize/2;
	const s = scalem(scaleSize, scaleSize, scaleSize);
	const t = translate( -centerX, -centerY, -centerZ );
	const mat = mult(s, t);
	this.center = vec4(centerX, centerY, centerZ, 1);
	this.radius = Math.sqrt((minX-centerX)*(minX-centerX) +(minY-centerY)*(minY-centerY) +(minZ-centerZ)*(minZ-centerZ) );
	this.modelRadius = this.radius * scaleSize;

	return mat;
}

Model.prototype.sendWorldMatrix = function(gl, program){
	const s = scalem(this.size, this.size, this.size);
	const r = rotate(this.xRot, [1,0,0]);
	const t = translate( this.loc[0], this.loc[1], this.loc[2] );
	this.worldMatrix = mult(t, mult(r, s));
	gl.uniformMatrix4fv( gl.getUniformLocation(program, "worldMatrix"), gl.FALSE, flatten(this.worldMatrix));
}

Model.prototype.updateSkeletonBone = function(bone, frameId, trackIndex){
	let jointMatrix, jointMatrixNextFrame;

	let animationTrack = bone.animationTracks[trackIndex];
	if(animationTrack === undefined){
		trackIndex = 0;
		animationTrack = bone.animationTracks[trackIndex];
	}

	let frameCount = animationTrack.keyFrameTransform.length;

	let frameIdModulo = frameId%frameCount;
	let frameIdOne = Math.floor(frameIdModulo);
	let frameIdTwo = frameIdOne + 1;
	if(frameIdTwo >= frameCount){
		frameIdTwo = 0;
	}
	let lerpAmount = frameIdModulo - frameIdOne;
	if(lerpAmount > 1){
		lerpAmount = 0;
	}

	if(frameCount > 0){
		jointMatrix = this.calJointMatrix4Bone(bone, trackIndex, frameIdOne);
		jointMatrixNextFrame = this.calJointMatrix4Bone(bone, trackIndex, frameIdTwo);
	} else {
		jointMatrix = this.calJointMatrix4Bone(bone, trackIndex, -1);
		jointMatrixNextFrame = this.calJointMatrix4Bone(bone, trackIndex, -1);
	}

	let IBM = bone.inverseBindMatrix;
	let SM = mult(jointMatrix, IBM);
	let SMNextFrame = mult(jointMatrixNextFrame, IBM);
	return {
		jointMatrix : jointMatrix,
		jointMatrixNF : jointMatrixNextFrame,
		skinningMatrix : SM,
		skinningMatrixNF : SMNextFrame,
		lerpAmount : lerpAmount
	};
}

Model.prototype.updateSkeleton = function(doCurrent, doNext){
	if(doCurrent){
		this.currentTrack.frameId += 0.1*this.playbackSpeed;
	}
	// if(doNext){
	// 	this.nextTrack.frameId += 0.1*this.playbackSpeed;
	// }

	for(var boneIdx = 0; boneIdx < this.dae.bones.length; ++boneIdx){
		let bone = this.dae.bones[boneIdx];

		if(doCurrent){
			// update current track
			let updatedInfo = this.updateSkeletonBone(bone, this.currentTrack.frameId, this.currentTrack.trackIndex);
			bone.jointMatrix = updatedInfo.jointMatrix;
			bone.jointMatrixNF = updatedInfo.jointMatrixNF;
			bone.skinningMatrix = updatedInfo.skinningMatrix;
			bone.skinningMatrixNF = updatedInfo.skinningMatrixNF;
			this.currentTrack.lerpAmount = updatedInfo.lerpAmount;
		}

		// if(doNext){
		// 	// update next track
		// 	let ntUpdatedInfo = this.updateSkeletonBone(bone, this.nextTrack.frameId, this.nextTrack.trackIndex);
		// 	bone.ntJointMatrix = ntUpdatedInfo.jointMatrix;
		// 	bone.ntJointMatrixNF = ntUpdatedInfo.jointMatrixNF;
		// 	bone.ntSkinningMatrix = ntUpdatedInfo.skinningMatrix;
		// 	bone.ntSkinningMatrixNF = ntUpdatedInfo.skinningMatrixNF;
		// 	this.nextTrack.lerpAmount = ntUpdatedInfo.lerpAmount;
		// }

	}

	///////////////////////////////////////////////////////
	// let jointMatrix;
	// let jointMatrixNextFrame;
	// let IBM;
	// let SM;
	// let SMNextFrame;
	// let frameCount;

	// this.currentTrack.frameId += 0.1*this.playbackSpeed;

	// for(var boneIdx = 0; boneIdx < this.dae.bones.length; ++boneIdx){
	// 	let trackIndex = this.currentTrack.trackIndex;
	// 	let bone = this.dae.bones[boneIdx];
	// 	let animationTrack = bone.animationTracks[trackIndex];
	// 	if(animationTrack === undefined){
	// 		trackIndex = 0;
	// 		animationTrack = bone.animationTracks[trackIndex];
	// 	}
	// 	frameCount = animationTrack.keyFrameTransform.length;

	// 	let frameIdModulo = this.currentTrack.frameId%frameCount;
	// 	let frameIdOne = Math.floor(frameIdModulo);
	// 	let frameIdTwo = frameIdOne + 1;
	// 	if(frameIdTwo >= frameCount){
	// 		frameIdTwo = 0;
	// 	}
	// 	let lerpAmount = frameIdModulo - frameIdOne;
	// 	if(lerpAmount > 1){
	// 		lerpAmount = 0;
	// 	}

	// 	if(frameCount > 0){
	// 		jointMatrix = this.calJointMatrix4Bone(bone, trackIndex, frameIdOne);
	// 		jointMatrixNextFrame = this.calJointMatrix4Bone(bone, trackIndex, frameIdTwo);
	// 	} else {
	// 		jointMatrix = this.calJointMatrix4Bone(bone, trackIndex, -1);
	// 		jointMatrixNextFrame = this.calJointMatrix4Bone(bone, trackIndex, -1);
	// 	}

	// 	IBM = bone.inverseBindMatrix;
	// 	bone.jointMatrix = jointMatrix;
	// 	bone.jointMatrixNextFrame = jointMatrixNextFrame;
	// 	SM = mult(jointMatrix, IBM);
	// 	bone.skinningMatrix = SM;
	// 	SMNextFrame = mult(jointMatrixNextFrame, IBM);
	// 	bone.skinningMatrixNF = SMNextFrame;
	// 	this.currentTrack.lerpAmount = lerpAmount;
	// }

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
	for(var i = 0; i < this.dae.bones.length; ++i){
		const bMLoc = gl.getUniformLocation( program, "boneMatrices["+i+"]");
		const bMNfLoc = gl.getUniformLocation( program, "boneMatricesNF["+i+"]");
		gl.uniformMatrix4fv(bMLoc, false, flatten(this.dae.bones[i].skinningMatrix));
		gl.uniformMatrix4fv(bMNfLoc, false, flatten(this.dae.bones[i].skinningMatrixNF));
	}
}

Model.prototype.pushBoneMatrixArrayNextTrack = function(gl, program){
	for(var i = 0; i < this.dae.bones.length; ++i){
		const bMLoc = gl.getUniformLocation( program, "ntBoneMatrices["+i+"]");
		const bMNfLoc = gl.getUniformLocation( program, "ntBoneMatricesNF["+i+"]");
		gl.uniformMatrix4fv(bMLoc, false, flatten(this.dae.bones[i].ntSkinningMatrix));
		gl.uniformMatrix4fv(bMNfLoc, false, flatten(this.dae.bones[i].ntSkinningMatrixNF));
	}
}

Model.prototype.pushLerpAmount = function(gl, program){
	const loc = gl.getUniformLocation(program, "lerpAmount");
	gl.uniform1f(loc, this.currentTrack.lerpAmount);	
}

Model.prototype.pushLerpAmountNextTrack = function(gl, program){
	const loc = gl.getUniformLocation(program, "lerpAmountNextTrack");
	gl.uniform1f(loc, this.nextTrack.lerpAmount);	
}

Model.prototype.updateInTransition = function(gl, program, lerpBetweenTracks){
	this.updateSkeleton(true, true);
}

Model.prototype.update = function(gl, program){
	this.updateSkeleton(true, false);
}

Model.prototype.render = function(gl, program, attributes, lerpBetweenTracks){

	this.pushBoneMatrixArray(gl, program);
	this.pushLerpAmount(gl, program);
	if(lerpBetweenTracks){
		this.pushBoneMatrixArrayNextTrack(gl, program);
		this.pushLerpAmountNextTrack(gl, program);
	}

	colladaParser_MakeVertexDataCopy(this.dae);	

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