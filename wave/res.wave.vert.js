var wave_v = `precision highp float;
attribute vec3 POSITION;
#define lerp(a,b,t) (a + ((b - a) * t))
#define sRange(x) ((x + 1.0) / 2.0)
#define rRange(x) ((x * 2.0) - 1.0)

uniform float _Time;
uniform float _NormalStep;
uniform float _XScale;
uniform float _RNGA[10], _RNGB[10], _RNGt;

varying float alpha;
const float PI = 3.141529653;

float animCurve(float x){
    return (1.0 + sin(PI * (x - 0.5))) * 0.5;
}

float RNGL(float min, float max, int i){
    return mix(min, max, mix(_RNGA[i], _RNGB[i], animCurve(_RNGt)));
}

vec3 calcWave(float x, float y, float z){
    float sx = _XScale * x;
    float wave_1 = sin((sx * RNGL(1.5, 1.2, 0)) + (z * RNGL(0.90, 1.10, 8)) + (_Time * 0.25));
    float wave_2 = sin((sx * RNGL(3.0, 1.5, 1)) + z + (_Time * 0.75));
    float wave_3 = sin(( z * RNGL(10.5, 8.5, 2) + cos(_Time * 0.5)) * mix(0.5, 1.0, cos(sx + (_Time * 0.25))));
    float wave_4 = cos((sx * RNGL(1.0, 1.5, 5)) + (z * RNGL(5.5, 3.4, 5)) + (_Time * 1.12)) * mix(0.2, 1.1, cos(sx + (_Time * 0.15)));
    float wave_5 = cos((sx * RNGL(2.2, 1.8, 4)) + (z * RNGL(7.2, 2.5, 6)) + (_Time * 1.2)) * mix(0.35, 0.8, cos(sx + (_Time * 0.35)));

    float wy = 
        (wave_1 * RNGL(1.00, 0.90,2)) + 
        (wave_2 * RNGL(0.65, 0.75,3)) + 
        (wave_3 * RNGL(0.55, 0.25,4)) + 
        (wave_4 * RNGL(0.37, 0.15,9)) + 
        (wave_5 * RNGL(0.21, 0.05,7));
    wy = wy + y;
    return vec3(x, wy, z);
}

void main() {

    vec3 wv = calcWave( POSITION.x, POSITION.y, POSITION.z );
    vec4 cvpos = vec4(wv.x, wv.y * 0.25, wv.z , 1.0 );
    gl_Position = cvpos;

    vec3 nrmx = calcWave( POSITION.x + _NormalStep, POSITION.y, POSITION.z);
    vec3 nrmy = calcWave( POSITION.x, POSITION.y, POSITION.z + _NormalStep);
    //float edge = pow(abs(cvpos.y), 4.0) * 1.5;
    alpha = 1.0 - abs( normalize( cross( nrmx, nrmy ) ).z );
    alpha = (1.0 - cos(pow(alpha, 2.0)));
    //alpha = max(edge, alpha);
    // alpha = 0.5;
}
`;