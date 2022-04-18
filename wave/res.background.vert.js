var background_v = `precision highp float;

attribute vec3 POSITION;
attribute float TEXCOORD0;
varying float screenPos;
uniform int _Month;

void main(){
    screenPos = POSITION.z;
    gl_Position = vec4(POSITION.xy, 0.0, 1.0);
}`;