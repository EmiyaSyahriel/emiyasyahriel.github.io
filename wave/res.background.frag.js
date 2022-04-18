var background_f = `precision highp float;

uniform vec3 _ColorA, _ColorB, _ColorC;
uniform float _TimeOfDay;

varying float screenPos;

void main(){
    //float color = (screenPos.x + screenPos.y) / 2.0;
    gl_FragColor = vec4(mix(mix(_ColorB, _ColorC, _TimeOfDay),_ColorA, screenPos), 1.0);
    //gl_FragColor = vec4(_ColorB, 1.0);
}
`;