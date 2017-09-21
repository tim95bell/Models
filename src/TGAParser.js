//Callback function that is called once the data for the TGA is downloaded. Also takes a reference to the parser.
//Parses and sets the texture data in WebGL
function  parseTGAFile(gl, binaryData,parser)
{
	// console.log("Loaded texture data")
	if (!binaryData) {
       alert("Error no TGA file data loaded: "+fileName);
		return;
   }
   var binaryDataUint8Array= new Uint8Array(binaryData);

   
   //00000000 11111111
   //01000
   //1123
   //100 2
   //1.4123132123 [11]=12 bytes
   var width = binaryDataUint8Array[12] +(binaryDataUint8Array[13]<<8);//15 14
   var height = binaryDataUint8Array[14] +(binaryDataUint8Array[15]<<8);//15 14
   var pixelDepth = binaryDataUint8Array[16];//24 bits for 3 channels bgr / 32 bits for 4 channels bgra
   var nChannels = pixelDepth/8;
   
   //Additionaly, reformat the  binaryDataUint8Array data to begin with the image data (offset the data by -18 bytes)
   for (var i =0;i<width*height*nChannels;i+=nChannels )
   {
	   	//todo
		//reformat the byte array from BGR data into RGB
	   binaryDataUint8Array[i]= binaryDataUint8Array[i+18+2]; //blue
	   binaryDataUint8Array[i+1]=binaryDataUint8Array[i+18+1]; //green
	   binaryDataUint8Array[i+2]= binaryDataUint8Array[i+18]; //red
   }
   
    //Creates a new texture within WebGL
	parser.texture = gl.createTexture();

	//Sets the current WebGL texture to the newly created texture
	gl.bindTexture(gl.TEXTURE_2D, parser.texture);



	

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB,  width,height, 0,gl.RGB,gl.UNSIGNED_BYTE, binaryDataUint8Array);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST); 
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); 
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); 
	 
	gl.generateMipmap(gl.TEXTURE_2D);

   
  // console.log(width,height,binaryDataUint8Array[16])
	// console.log( binaryDataUint8Array[18],binaryDataUint8Array[19],binaryDataUint8Array[20])//bgr

}

function TGAParser(gl, fileName){
    //Set texture reference to null
    this.texture=null;
	//console.log("Request texture data "+fileName )
	
	//Create a HTTP request
	var oReq;   
	if (window.XMLHttpRequest)
	{       
	   oReq = new XMLHttpRequest(); 
	}
//return;
	if (oReq != null)
	{  
	   //Set the request parser to this object
	   oReq.parser= this;
	   //Request the given file in asynchronous mode       
	   oReq.open("GET", fileName, true); 
	   //Request that the response data comes as an arraybuffer
	   oReq.responseType = "arraybuffer";
	   //When the response arrives call the function parseTGAFile and pass the fileData as a parameter       
	   oReq.onreadystatechange = function()
	   {       
		  if (oReq.readyState == 4 && oReq.status == 200)
		  {
			  parseTGAFile(gl, oReq.response,oReq.parser);           
		  }       
		}
	   oReq.send();   
	}   
	else
	{         
	   window.alert("Error creating XmlHttpRequest object.");   
	}
}