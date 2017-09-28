attribute vec4 vPos; 
attribute vec2 vTex;
attribute vec4 bWeights;
attribute vec4 bIndices;

uniform mat4 modelMatrix;
uniform mat4 worldMatrix;
uniform mat4 viewMat;
uniform mat4 projMat;

uniform mat4 boneMatrices[30];
uniform mat4 boneMatricesNF[30];
uniform float lerpAmount;

varying vec2 varyingTex;

void main() 
{
	varyingTex = vTex;

    vec4 frameOnePosition = vec4(0,0,0,0);
    vec4 frameTwoPosition = vec4(0,0,0,0);
    for(int i = 0; i < 4; ++i){
        frameOnePosition += 
            boneMatrices[ int(bIndices[i]) ] *
            bWeights[i] * vPos;
        frameTwoPosition += 
            boneMatricesNF[ int(bIndices[i]) ] *
            bWeights[i] * vPos;
    }

    vec4 finalPosition = mix(frameOnePosition, frameTwoPosition, lerpAmount);

    gl_Position = projMat * viewMat * worldMatrix * modelMatrix * finalPosition; 
}
