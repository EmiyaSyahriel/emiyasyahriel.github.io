var wave_f = `precision lowp float;
varying float alpha;
uniform vec4 _ColorA, _ColorB;

void main(){
    gl_FragColor = mix(_ColorB, _ColorA, alpha);
    // gl_FragColor = vec4(v2f_normal, 1);
}`;