var spark_v = `precision highp float;
attribute vec2 POSITION;
attribute float TIME;

uniform vec3 _Color;
uniform vec2 _ScreenSize;

varying vec4 _VColor;

const float PI = 3.141529653;

float animCurve(float x){ return 1.0 - pow(1.0 - sin(PI * x), 2.0); }

float nRange(float x){ return (x * 2.0) - 1.0; }

vec2 scaledPos(){
    float x = POSITION.x / _ScreenSize.x;
    float y = POSITION.y / _ScreenSize.y;
    return vec2(nRange(x), nRange(y));
}

void main(){
    gl_Position = vec4(scaledPos(), 0.0, 1.0);
    _VColor = vec4(_Color, mix(0.0, 1.0, animCurve(TIME)));
}`;