function AnimationTrack()
{
	this.keyFrameTimes			= [];
	this.keyFrameTransform		= [];
}
function BoneData(boneName,_index)
{
	this.hasParent = function()
	{
		return parent!=null;
	}
		
	//Read only data
	this.name							= boneName;	
	this.parent							= null;
	this.inverseBindMatrix				= null;
	this.bindPoseMatrix					= null;
	this.children						= [];
	this.animationTracks				= [];
	this.boneIndex						= _index;
	
	//Writable variables to determine the current transform of the bone
	this.jointMatrix						= null;
	this.skinningMatrix						= null;

	// TIM: added for lerp
	this.jointMatrixNextFrame				= null;
	this.skinningMatrixNextFrame			= null;
	
	this.currentAnimationTime				= 0;
	this.currentFrame						= 0;
}
function multMat4Vec3(m,vx,vy,vz)
{
	var transformedVertex = vec4(vx,vy,vz,1);
	var readVertex = vec4(vx,vy,vz,1);
	for (var posId =0;posId<3;posId++)
		transformedVertex[posId]=dot(readVertex,m[posId]);
	return transformedVertex;
}
function ColladaParser(fileName)
{
	//Bounding Box Data
	this.boundBoxInit=false;
	
	//Model Data
	this.vertexPositionDataRead= [];
	this.vertexNormalDataRead= [];
	this.vertexTextureDataRead= [];
	this.vertexNumBonesDataRead = [];
	this.vertexBoneWeightDataRead = [];
	this.vertexBoneIndexDataRead = [];
	this.vertexIndexes	=[];
	
	//Modifable vertex array copy
	this.vertexPositionDataWrite = [];
	
	objCode = loadFileAJAX(fileName);
    if (!objCode) {
       alert("Could not find shader source: "+fileName);
    }
	

	var xmlDoc;
	if (window.DOMParser)
	{
		parser = new DOMParser();
		xmlDoc = parser.parseFromString(objCode, "text/xml");
	}
	else // Internet Explorer
	{
		xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async = false;
		xmlDoc.loadXML(objCode);
	}
	
	var rootNode = xmlDoc.documentElement.childNodes;

	 //Gets the texture information
	colladaParser_ImageLibrary(this,xmlDoc);
	
	//Gets the static model data positions, textureCoordinates and normals
	colladaParser_BuildLibraryGeometery(this,xmlDoc);
	
	//buildLibraryControllers gets the bone weights and indexes for each bone as well as each bones name and inverse bind matrix
	colladaParser_BuildLibraryControllers(this,xmlDoc);

	//Build Scene builds the bone hierarchy and gives each bone their bind shape matrix	        
	colladaParser_BuildScene(this,xmlDoc);

	//Build Animations builds the animation data for all the bones
	//Note the the collada files have been hacked to include multiple library_animations to indicate multiple animation tracks
	colladaParser_BuildAnimations(this,xmlDoc);	

	//Save some effort later by transforming all the vertexes by the bind shape matrix now
	colladaParser_TransformAllVertexesByBindShapeMatrix(this); 
	
	//Copy all the data into vertexDataWrite to allow it to be modified while maintaining a copy of the original data
	colladaParser_MakeVertexDataCopy(this);
	
	this.center = vec3((this.minX+this.maxX)*0.5,(this.minY+this.maxY)*0.5,(this.minZ+this.maxZ)*0.5);
	this.radius = Math.sqrt((this.minX-this.center[0])*(this.minX-this.center[0]) +(this.minY-this.center[1])*(this.minY-this.center[1]) +(this.minZ-this.center[2])*(this.minZ-this.center[2]) );
	this.subMeshIndex=[0,this.vertexPositionDataRead.length/3 ];
	// this.subMeshIndex=[vertexPositions.length, vertexPositions.length + this.vertexPositionDataRead.length/3 ];
	// this.subMeshIndex=[vertexPositions.length/3, this.vertexPositionDataRead.length/3 ];
}
function colladaParser_MakeVertexDataCopy(parser)
{
	parser.vertexPositionDataWrite=[];
	for (var vertexId=0;vertexId<parser.vertexPositionDataRead.length;vertexId++ )
		parser.vertexPositionDataWrite.push(parser.vertexPositionDataRead[vertexId]);
}	
function colladaParser_TransformAllVertexesByBindShapeMatrix(parser)
{
	
	parser.boundBoxInit=false;
	for (var vertexId =0;vertexId<parser.vertexPositionDataRead.length/3;vertexId++)
	{
		var transformedVertex = multMat4Vec3(parser.bindShapeMatrix,parser.vertexPositionDataRead[vertexId*3],parser.vertexPositionDataRead[vertexId*3+1],parser.vertexPositionDataRead[vertexId*3+2]);
		for (var posId =0;posId<3;posId++)
			parser.vertexPositionDataRead[vertexId*3+posId]=transformedVertex[posId];	
		colladaParser_AddVertexPositionToBoundingBox(parser,parser.vertexPositionDataRead[vertexId*3+0],parser.vertexPositionDataRead[vertexId*3+1],parser.vertexPositionDataRead[vertexId*3+2]);
	}
}
function colladaParser_BuildAnimations(parser,xmlDoc)
{
	var animationLibraryList = xmlDoc.getElementsByTagName("library_animations");
	if (animationLibraryList.length==0)
       return;
   
	for (var animationTrackId = 0; animationTrackId < animationLibraryList.length; animationTrackId++) 
		for (var boneId=0;boneId<parser.bones.length;boneId++)
			parser.bones[boneId].animationTracks.push(new AnimationTrack());
	
	numberOfAnimations = animationLibraryList.length;
	for (var animationTrackId = 0; animationTrackId < numberOfAnimations; animationTrackId++) 
	{
		var currentAnimation = animationLibraryList[animationTrackId];
		var boneAnimation = currentAnimation.getElementsByTagName("animation");
		for (var boneAnimationId = 0; boneAnimationId < boneAnimation.length; boneAnimationId++)
		{
			var currentBoneAnimation = boneAnimation[boneAnimationId];
			var sourceList = currentBoneAnimation.getElementsByTagName("source");
			var keyFrameTimes = null;
			var keyFrameTransformData = null;
			
			for (var sourceId = 0; sourceId < sourceList.length; sourceId++)
			{
				var currentSource = sourceList.item(sourceId);
				var FloatArrayList =currentSource.getElementsByTagName("float_array");
				if (FloatArrayList.length>0)       
				{
					var tempData = convertStringToFloatArrayList(FloatArrayList[0].firstChild.nodeValue); 
					if (sourceId==0)//Key Frame Times
						keyFrameTimes=tempData;
					if (sourceId==1)//Matrix Data
						keyFrameTransformData=tempData;
				}	
			}
			
			if (keyFrameTimes!=null && keyFrameTransformData!=null)
			{
				var channelList = currentBoneAnimation.getElementsByTagName("channel");
				
				if (channelList.length>0)
				{
					var channelElement = channelList[0];
					var target = channelElement.getAttribute("target");
					var boneTarget = null;
					var operation=-1;
					if (target.endsWith("/matrix"))
					{
						target=target.substring(0, target.length-"/matrix".length);
						operation=0;
					}
					if (target.endsWith("/transform"))
					{
						target=target.substring(0, target.length-"/transform".length);
						operation=0;
					}
					if (target.endsWith("/location.X"))
					{
						target=target.substring(0, target.length-"/location.X".length); 
						operation=1;
					}
					if (target.endsWith("/location.Y"))
					{
						target=target.substring(0, target.length-"/location.Y".length); 
						operation=2;
					}
					if (target.endsWith("/location.Z"))
					{
						target=target.substring(0, target.length-"/location.Z".length); 
						operation=3;
					}
					if (target.endsWith("/scale.X"))
					{
						target=target.substring(0, target.length-"/Scale.X".length); 
						operation=4;
					}	        	
					if (target.endsWith("/scale.Y"))
					{
						target=target.substring(0, target.length-"/Scale.Y".length); 
						operation=5;
					}	    
					if (target.endsWith("/scale.Z"))
					{
						target=target.substring(0, target.length-"/Scale.Z".length); 
						operation=6;
					}
					
					/*if (target.endsWith("/rotation.X"))
					{
						target=target.substring(0, target.length-"/Scale.X".length); 
						operation=4;
					}	        	
					if (target.endsWith("/Scale.Y"))
					{
						target=target.substring(0, target.length-"/Scale.Y".length); 
						operation=5;
					}	    
					if (target.endsWith("/Scale.Z"))
					{
						target=target.substring(0, target.length-"/Scale.Z".length); 
						operation=6;
					}	 */       			
					
					
					boneTarget=getBoneId(parser,target);
					if (boneTarget!=null)
					{
						insertNewKeyFrameTransforms(boneTarget.animationTracks[animationTrackId],operation,keyFrameTimes,keyFrameTransformData);
						//boneTarget.animationTracks.get(animationTrackId).keyFrameTimes		= keyFrameTimes;
						//boneTarget.animationTracks.get(animationTrackId).keyFrameTransform	= keyFrameTransforms;
					}
				}
			}
		}
		
	}
}
function insertNewKeyFrameTransforms(animationTrack, operation,keyFrameTimes,keyFrameTransformData)
{
	var transformfloatOffset=0;
	for (var newKeyFrameId =0;newKeyFrameId<keyFrameTimes.length;newKeyFrameId++)
	{
		//Find the matching keyframe time if one exists, otherwise create a new one
		var matchingkeyFrameIndex=-1;
		var currentMatrix=null;
		for (var keyFrameId =0;keyFrameId<animationTrack.keyFrameTimes.length;keyFrameId++)
		{
			if (animationTrack.keyFrameTimes[keyFrameId]==keyFrameTimes[newKeyFrameId])
			{
				matchingkeyFrameIndex=keyFrameId;
				break;
			}
		}
		if (matchingkeyFrameIndex==-1)
		{
			matchingkeyFrameIndex=animationTrack.keyFrameTimes.length;
			animationTrack.keyFrameTimes.push(keyFrameTimes[newKeyFrameId]);	
			animationTrack.keyFrameTransform.push(mat4());			
		}
		currentMatrix=animationTrack.keyFrameTransform[matchingkeyFrameIndex];
		if (operation==0)//matrix operation
		{
			//currentMatrix=matrixTransform(keyFrameTransformData,transformfloatOffset);
			currentMatrix=mat4(collada_SubSet(keyFrameTransformData,transformfloatOffset,16));
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			transformfloatOffset+=16;
		}
		if (operation==1)//location x
		{
			setMat4Element(currentMatrix,3,0,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(3, 0,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}		
		if (operation==2)//location y
		{
			setMat4Element(currentMatrix,3,1,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(3, 1,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}	
		if (operation==3)//location z
		{
			setMat4Element(currentMatrix,3,2,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(3, 2,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}
		if (operation==4)//scale x
		{
			setMat4Element(currentMatrix,0,0,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(0, 0,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}		
		if (operation==5)//scale y
		{
			setMat4Element(currentMatrix,1,1,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(1, 1,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}	
		if (operation==6)//scale z
		{
			setMat4Element(currentMatrix,2,2,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(2, 2,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}			
		
		if (operation==7)//rotation x
		{
			setMat4Element(currentMatrix,0,0,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(0, 0,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}		
		if (operation==8)//rotation y
		{
			setMat4Element(currentMatrix,1,1,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(1, 1,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}	
		if (operation==9)//rotation z
		{
			setMat4Element(currentMatrix,2,2,keyFrameTransformData[transformfloatOffset]);
			//currentMatrix.set(2, 2,keyFrameTransformData.get(transformfloatOffset) );
			animationTrack.keyFrameTransform[matchingkeyFrameIndex]=(currentMatrix);
			//animationTrack.keyFrameTransform.set(matchingkeyFrameIndex,currentMatrix);
			transformfloatOffset+=1;
		}				
	}
}
function setMat4Element(matrixE,column,row,val)
{
	matrixE.m[row][val]=val;
}
function colladaParser_BuildScene(parser,xmlDoc)
{
	
	var sceneNodeList = xmlDoc.getElementsByTagName("library_visual_scenes");
	if (sceneNodeList.length==0)
       return;
   
    var visualSceneElement=sceneNodeList[0]; 
	var nList = visualSceneElement.getElementsByTagName("node");
	
	for (var temp = 0; temp < nList.length; temp++) 
	{    	
		var nodeElement = nList[temp];
		var attribute = nodeElement.getAttribute("type");
		if (attribute == "JOINT")
		{
			var rootBone=getBone(parser,nodeElement.getAttribute("sid"));
			parser.tempBoneIds[rootBone.boneIndex] =nodeElement.getAttribute("id");
			
			setBoneBindPoseMatrix(parser,rootBone,nodeElement);
			//console.log(parser.bones[0]);
			processChildBones(parser,rootBone,nodeElement.childNodes);
			break;//only allow for one root bone
		}        	
	}
}
function processChildBones(parser,parent,currentNodes)
{
	if (currentNodes.length==0)
		return;
	for (var temp = 0; temp < currentNodes.length; temp++) 
	{
		if (currentNodes[temp].nodeType == 1)
		{
			var nodeElement = currentNodes[temp];
			if (nodeElement.hasAttribute("type") && nodeElement.getAttribute("type")=="JOINT")
			{
				
				var currentBone=getBone(parser,nodeElement.getAttribute("sid"));
				//console.log(currentBone,nodeElement.getAttribute("sid"),nodeElement);
				if (currentBone==null)//the bone was not created within the library controllers, most likely as no vertexes are attached to this bone
				{
					currentBone = new BoneData(nodeElement.getAttribute("sid"),parser.bones.length);
					setBoneBindPoseMatrix(parser,currentBone,nodeElement);
					currentBone.inverseBindMatrix = inverse(currentBone.bindPoseMatrix);
					parser.bones.push(currentBone);
					//for (int animationTrackId = 0; animationTrackId < numberOfAnimations; animationTrackId++) 
					//	currentBone.animationTracks.push(new AnimationTrack());
					
					parser.tempBoneIds.push("");
				}
				else
					setBoneBindPoseMatrix(parser,currentBone,nodeElement);
				parser.tempBoneIds[currentBone.boneIndex]=nodeElement.getAttribute("id");
				currentBone.parent = parent;
				parent.children.push(currentBone);
				
				processChildBones(parser,currentBone,nodeElement.childNodes);
			}
		}
		
	}        
}
function setBoneBindPoseMatrix(parser,bone,currentElement)
{
	var nList =currentElement.getElementsByTagName("matrix");
	if (nList.length==0)
		return;
	
	var inverseMatrixFloats = convertStringToFloatArrayList(nList[0].firstChild.nodeValue);	
	//Matrix newMatrix = matrixTransform(inverseMatrixFloats,0);
	bone.bindPoseMatrix=mat4(inverseMatrixFloats);      
}

function getBone(parser,boneName)
{
	for (var i =0;i<parser.bones.length;i++)
		if (parser.bones[i].name ==  boneName)
		{
			return parser.bones[i];
		}
	
	return null;
}
function getBoneId(parser,boneId)
{
	//console.log(parser.tempBoneIds)
	for (var i =0;i<parser.tempBoneIds.length;i++)
			if (parser.tempBoneIds[i] == boneId)
				return parser.bones[i];
	
	return null;
}
function collada_SubSet(arrayS,startIndex,size)
{
	var ret = [];
	for (var i = 0;i<size;i++)
		ret.push(arrayS[startIndex+i]);
	return ret;
}
function colladaParser_BuildLibraryControllers(parser,xmlDoc)
{
	var controllerNodeList = xmlDoc.getElementsByTagName("library_controllers");
	if (controllerNodeList.length==0)
       return;
	parser.bones = [];
	parser.tempBoneIds=[];
	
	
	//Setup the bone data
	for (var i =0;i<parser.vertexPositionDataRead.length;i++)
	{
	 	parser.vertexNumBonesDataRead.push(0);
		for (var j =0;j<4;j++)// assume max of 4 bones
		{
			parser.vertexBoneWeightDataRead.push(0);
			parser.vertexBoneIndexDataRead.push(0);
		}
	}
	 
	{
		var bindShapeMatrixNodeList = controllerNodeList[0].getElementsByTagName("bind_shape_matrix");
        if (bindShapeMatrixNodeList.length!=0)
        {
        	var bindShapeMatrixElement = bindShapeMatrixNodeList[0];
        	var bindShapeMatrixFloats=convertStringToFloatArrayList(bindShapeMatrixElement.firstChild.nodeValue);
        	parser.bindShapeMatrix=new mat4(bindShapeMatrixFloats);//matrixTransform(bindShapeMatrixFloats,0);		
			//console.log(parser.bindShapeMatrix);
        }
		
	}
	
	if (controllerNodeList[0] .nodeType == 1)
	{
		var nList=controllerNodeList[0].getElementsByTagName("controller");
		if (nList.length>0)
		{
			var controllerElement = nList[0];
			var sourceList =controllerElement.getElementsByTagName("source");
			var vertexWeights=null;
			var vertexCounts=null;
			var vertexIndexes=null;
			//Source 0 Joint Names
			{
				var NameArrayList =sourceList[0].getElementsByTagName("Name_array");
				if (NameArrayList.length>0)
				{
					var jointNames = NameArrayList[0].firstChild.nodeValue.split(" ");
					for (var boneId=0;boneId<jointNames.length;boneId++)
					{
						parser.bones.push(new BoneData(jointNames[boneId],boneId));
						parser.tempBoneIds.push(jointNames[boneId]);
					}
				}
			}
			//Source 1 InverseBindMatrix
			{
				var FloatArrayList =sourceList[1].getElementsByTagName("float_array");
				if (FloatArrayList.length>0)
				{
					var inverseMatrixFloats = convertStringToFloatArrayList(FloatArrayList.item(0).firstChild.nodeValue);
					for (var matrixId=0;matrixId<inverseMatrixFloats.length/16;matrixId++)
					{		
						var newMatrix = mat4(collada_SubSet(inverseMatrixFloats,16*matrixId,16));//;matrixTransform(inverseMatrixFloats,16*matrixId); 
						parser.bones[matrixId].inverseBindMatrix=newMatrix;
					}
				}
			}   
			//Source 2 Vertex Weights
			{
				var FloatArrayList =sourceList[2].getElementsByTagName("float_array");
				if (FloatArrayList.length>0)
					vertexWeights= convertStringToFloatArrayList(FloatArrayList.item(0).firstChild.nodeValue);
			}   
			
			var vCount =controllerElement.getElementsByTagName("vcount");
			if (vCount.length>0)
				vertexCounts= convertStringToIntegerArrayList(vCount[0].firstChild.nodeValue);
			var v =controllerElement.getElementsByTagName("v");
			if (v.length>0)
				vertexIndexes= convertStringToIntegerArrayList(v[0].firstChild.nodeValue);
			
			if (vertexIndexes!=null && vertexCounts!=null && vertexWeights!=null)
			{
				var vOffSet=0;
				for (var boneCountId=0;boneCountId< vertexCounts.length;boneCountId++)
				{
					var numBones = vertexCounts[boneCountId];
					var boneIndexes =  [0,0,0,0];
					var boneWeights =  [0,0,0,0];
					for (var x=0;x<numBones;x++)
					{
						if (x<4)
							boneIndexes[x]=vertexIndexes[vOffSet];
						vOffSet++;
						if (x<4)
							boneWeights[x]=vertexWeights[vertexIndexes[vOffSet]];
						vOffSet++;
					}
					fillVertexBoneData(parser,boneCountId,numBones,boneIndexes,boneWeights);
				}
			}
			
		}
		//console.log(nList);
	}
}

function fillVertexBoneData(parser, boneCountId, numBones,boneIndexes,boneWeights)
{
	
	for (var i =0;i<parser.vertexIndexes.length;i++)
		if (parser.vertexIndexes[i]==boneCountId)
		{
			parser.vertexNumBonesDataRead[i] = numBones;
			for (var j=0;j<4;j++)
			{
				parser.vertexBoneWeightDataRead[i*4+j] = boneWeights[j];
				parser.vertexBoneIndexDataRead[i*4+j] = boneIndexes[j];
			}
		}
}
	
function colladaParser_BuildLibraryGeometery(parser,xmlDoc)
{
	var imageNode = xmlDoc.getElementsByTagName("library_geometries")[0];
	var xlen = imageNode.childNodes.length;
	var node = imageNode.firstChild;
	//console.log(xlen);
	for (var j = 0; j <xlen; j++) {
	  if (node.nodeType == 1) 
	  {
		colladaParser_BuildGeometeryNode(parser,node);
		//console.log(node.nodeName);
	  }
	  node = node.nextSibling;
	}
	
}
function colladaParser_BuildGeometeryNode(parser,geomNode)
{
	var xlen = geomNode.childNodes.length;
	var node = geomNode.firstChild;
	//console.log(xlen);
	for (var j = 0; j <xlen; j++) {
	  if (node.nodeType == 1) 
	  {
		colladaParser_BuildGeometeryMeshNode(parser,node);
		//console.log(node.nodeName);
	  }
	  node = node.nextSibling;
	}
}

function colladaParser_BuildGeometeryMeshNode(parser,geomMeshNode)
{
	var vertexPositions=null;
	var vertexNormals=null;
	var vertexTexture=null;
	var positionStride=0;
	var normalStride=0;
	var textureStride=0;
	
	var sourceList = geomMeshNode.getElementsByTagName("source");
	var numberSources = sourceList.length;
	//console.log(sourceList,numberSources);
	
	//Get the raw positional data
	for (var j = 0; j <numberSources; j++) {
		var node = sourceList[j];
		var floatArrayString = node.getElementsByTagName("float_array")[0].firstChild.nodeValue;
		//console.log(floatArrayString);
		var stride = 0;
		if (node.getElementsByTagName("accessor").length>0) 
			stride= parseInt(node.getElementsByTagName("accessor")[0].getAttribute("stride"));
		//console.log(stride);
		if (vertexPositions==null)
	    {
		   vertexPositions=convertStringToFloatArrayList(floatArrayString);
		   for (var posId=0;posId<vertexPositions.length;posId+=3)
			   colladaParser_AddVertexPositionToBoundingBox(parser,vertexPositions[posId],vertexPositions[posId+1],vertexPositions[posId+2]);
		   positionStride=stride;
	    }
		else if (vertexNormals==null)
	    {
		   vertexNormals=convertStringToFloatArrayList(floatArrayString);
		   normalStride=stride;
	    } 
	    else if (vertexTexture==null)
	    {
		   vertexTexture=convertStringToFloatArrayList(floatArrayString);
		   //console.log("VT",vertexTexture,floatArrayString);
		   textureStride=stride;
	    }   	   
	}
	
	var triangleList = geomMeshNode.getElementsByTagName("triangles");
	if (triangleList.length==0)
		triangleList = geomMeshNode.getElementsByTagName("polylist");
	//console.log(triangleList);
	if (triangleList.length>0)
	{
		var trianglesElement = triangleList[0];
		var pList = trianglesElement.getElementsByTagName("p");
		if (pList.length>0)
		{
			//console.log(pList[0].firstChild.nodeValue);
			var indexes = convertStringToIntegerArrayList(pList[0].firstChild.nodeValue);
			var count =0;
			var vertexDataReadLastElementIndex=-1;
			for (var index=0;index<indexes.length;index++)
			{
				var currentIndex = indexes[index];
				if (count==0 )
				{
					//var newVertex = new ColladaVertex3D();
					for (var x =0;x<positionStride;x++)
					   if (x<3)
						   parser.vertexPositionDataRead.push(vertexPositions[x+currentIndex*positionStride]);
				   
		
					parser.vertexIndexes.push(currentIndex);
					vertexDataReadLastElementIndex++;   
				}
				
				if (count==1 )
			    {               				   
				   for (var x =0;x<normalStride;x++)
					   if (x<3)
						   parser.vertexNormalDataRead.push(vertexNormals[x+currentIndex*normalStride]);       					   
			    } 
				if (count==2 )
			    {               				   
				   for (var x =0;x<2;x++)//use 2 instead of vertexTexture because we only want the first two coordinates (x,y)
					   if (x<2)
						   parser.vertexTextureDataRead.push(vertexTexture[x+currentIndex*textureStride]);       					   
			    } 			
				count=(count+1)%numberSources;  
			}
		}
	}
	
}
function convertStringToIntegerArrayList(line)
{
	var numbers=[];
	var splitLine=line.split(" ");
	for (var i =0;i<splitLine.length;i++)
		numbers.push(parseInt(splitLine[i]));
	return numbers;
}
function convertStringToFloatArrayList(line)
{
	var numbers=[];
	var splitLine=line.split(" ");
	for (var i =0;i<splitLine.length;i++)
		numbers.push(parseFloat (splitLine[i]));
	return numbers;
}
function colladaParser_AddVertexPositionToBoundingBox(parser,x,y, z)
{
	//console.log("asd");
	if (parser.boundBoxInit==false)
	{
		parser.minX=parser.maxX=x;
		parser.minY=parser.maxY=y;
		parser.minZ=parser.maxZ=z;
		parser.boundBoxInit=true;
	}else
	{
		parser.minX = Math.min(x, parser.minX);
		parser.minY = Math.min(y, parser.minY);
		parser.minZ = Math.min(z, parser.minZ);
		parser.maxX = Math.max(x, parser.maxX);
		parser.maxY = Math.max(y, parser.maxY);
		parser.maxZ = Math.max(z, parser.maxZ);
	}
}
function colladaParser_ImageLibrary(parser,xmlDoc)
{
	
	parser.textureData= [];
	var imageNode = xmlDoc.getElementsByTagName("library_images")[0];//imageLib.firstChild;
	var xlen = imageNode.childNodes.length;
	var node = imageNode.firstChild;
	for (var j = 0; j <xlen; j++) {
	  if (node.nodeType == 1) 
		colladaParser_ImageLibrary_GetImageName(parser,node);
	  node = node.nextSibling;
	}
//console.log(parser.textureData,xlen);
}
function colladaParser_ImageLibrary_GetImageName(parser,imageSubNode)
{
	var xlen = imageSubNode.childNodes.length;
	var node = imageSubNode.firstChild;
	
	for (var j = 0; j <xlen; j++) {
	  if (node.nodeType == 1) 
		 parser.textureData.push([imageSubNode.getAttribute("id"),node.childNodes[0].data]);   
	  node = node.nextSibling;
	}
}