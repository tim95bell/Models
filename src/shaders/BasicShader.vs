attribute vec4 aPosition; 
attribute vec2 aTexture;
attribute vec4 boneWeight;
attribute vec4 boneIndex;

uniform mat4 modelMatrix;
uniform mat4 worldMatrix;
uniform mat4 viewProjectionMatrix;

uniform mat4 boneMatrices[30];
uniform mat4 boneMatricesNextFrame[30];
uniform float lerpAmount;

varying vec2 vTex;

void main() 
{
	vTex=aTexture;

    vec4 frameOnePosition = vec4(0,0,0,0);
    vec4 frameTwoPosition = vec4(0,0,0,0);
    for(int i = 0; i < 4; ++i){
        frameOnePosition += 
            boneMatrices[ int(boneIndex[i]) ] *
            boneWeight[i] * aPosition;
        frameTwoPosition += 
            boneMatricesNextFrame[ int(boneIndex[i]) ] *
            boneWeight[i] * aPosition;
    }

    vec4 finalPosition = mix(frameOnePosition, frameTwoPosition, lerpAmount);

    gl_Position = viewProjectionMatrix * worldMatrix * modelMatrix * finalPosition; 
}
