/* unproject - convert screen coordinate to WebGL Coordinates 
 *   winx, winy - point on the screen 
 *   winz       - winz=0 corresponds to newPoint and winzFar corresponds to farPoint 
 *   mat        - model-view-projection matrix 
 *   viewport   - array describing the canvas [x,y,width,height] 
 */ 
function unproject(winx,winy,winz,mat,viewport){ 
 
  winx = 2 * (winx - viewport[0])/viewport[2] - 1; 
  winy = 2 * ((viewport[3]-winy) - viewport[1])/viewport[3] - 1; 
  winz = 2 * winz - 1; 
  var invMat = inverse(mat); 
  var n = vec4(winx,winy,winz,1); 

  n = multiplyMat4Vec4(invMat,n);
  return [n[0]/n[3],n[1]/n[3],n[2]/n[3],1] 
} 

function subtractPoints( p1, p2)
{
	var ret=[p1[0]-p2[0],p1[1]-p2[1],p1[2]-p2[2]];
	return ret;
}


function addPoints( p1, p2)
{
	var ret=[p1[0]+p2[0],p1[1]+p2[1],p1[2]+p2[2]];
	return ret;
}  

  
function multiplyPoint( p1, amount)
{
	var ret=[p1[0]*amount,p1[1]*amount,p1[2]*amount];
	return ret;
}  


function devidePoint( p1, amount)
{
	var ret=[p1[0]/amount,p1[1]/amount,p1[2]/amount];
	return ret;
}  

function normaliseVector( p)
{
	var size = Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2]);
	var ret = [p[0]/size,p[1]/size,p[2]/size];
	return ret;
}


function dotProduct( p1, p2)
{
	return p1[0]*p2[0]+p1[1]*p2[1]+p1[2]*p2[2];
}


function dotProductAmount( p1, amount)
{
	return p1[0]*amount+p1[1]*amount+p1[2]*amount;
}  

    
function multiplyMat4Vec4(mat,v)
{
	var ret = []
	for (var i=0;i<4;i++)
	{
		var temp=0;
		for (var j=0;j<4;j++)
			temp += mat[i][j]*v[j];
		ret.push(temp);
	}
	return ret;
}