attribute vec4 vPos; 
attribute vec2 vTex;
attribute vec4 bWeights;
attribute vec4 bIndices;

uniform mat4 modelMat;
uniform mat4 worldMat;
uniform mat4 viewMat;
uniform mat4 projMat;

uniform mat4 boneMatrices[30];
uniform mat4 boneMatricesNF[30];
uniform float lerpAmount;

uniform mat4 ntBoneMatrices[30];
uniform mat4 ntBoneMatricesNF[30];
uniform float ntLerpAmount;

uniform float lerpBetweenTracksAmount;

varying vec2 varyingTex;

void main() 
{
	varyingTex = vTex;

    // determine final position based on current track
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

    // determine current position based on next track, if in transition
    if(lerpBetweenTracksAmount > 0.0){
        vec4 ntFrameOnePosition = vec4(0,0,0,0);
        vec4 ntFrameTwoPosition = vec4(0,0,0,0);
        for(int i = 0; i < 4; ++i){
            ntFrameOnePosition += 
                ntBoneMatrices[ int(bIndices[i]) ] *
                bWeights[i] * vPos;
            ntFrameTwoPosition += 
                ntBoneMatricesNF[ int(bIndices[i]) ] *
                bWeights[i] * vPos;
        }

        vec4 ntFinalPosition = mix(ntFrameOnePosition, ntFrameTwoPosition, ntLerpAmount);
        finalPosition = mix(ntFinalPosition, finalPosition, lerpBetweenTracksAmount);
    }


    gl_Position = projMat * viewMat * worldMat * modelMat * finalPosition;
}