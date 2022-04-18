/** @type {HTMLCanvasElement} */
var canvas = document.getElementById("c");
/** @type {WebGLRenderingContext} */
var gl = canvas.getContext("webgl");

function lerp(a,b,t) { 
    var retval =  a + ((b - a) * t);
    return isFinite(retval) ? retval : 0.5;
}
function lfact(a,b,v) { return (v - a) / (b - a) }

const disableSelfErrorReport = true;
const enableSpector = false;
const xmb_detail_size = 128;

/** @type {WebGLShader} */
var exeBg, exeWv, exeVtx;
var wave_data = [];
var wave_data_s = [];
var freq_data = 0;
var currentTime = 0.0;
var accelCTime = 0.0;
var date = new Date();
var isWPE = false;
var update_i = 0;

var spark = {};
var wave = {};
var bg = {};

var colors = [
    [0.6, 0.0, 1.0],
    [1.0, 1.0, 0.9],
    [0.0, 0.6, 1.0],
    [0.0, 0.6, 0.0],
    [1.0, 0.6, 0.0]
];
var hit_change_index = 0;

var color = [0.6, 0.0, 1.0];

function getWaveData(x, y){
    x = Math.abs(x + (accelCTime * -0.0125)) % 1.0;

    var arr = y > 0.5 ? wave_data : wave_data_s;

    var max = arr.length
    var a = Math.floor(x * max) % max;
    var b = Math.ceil(x * max) % max;
    a = isFinite(a) ? a : 0;
    b = isFinite(b) ? b : 1;

    var _a = arr[a];
    var _b = arr[b];
    var t = (x * max) - a;
    var retval = lerp(_a, _b, t);
    if(isNaN(retval) || !isFinite(retval)) retval = 0.0;

    return retval * lerp(1.0, 5.0, freq_data * 2.0);
}

function putVisData(data){
    wave_data = data;
    var dMaxCount = Math.max(data.length, wave_data.length);
    var freq = 0;
    for(var i = 0; i < dMaxCount; i++){
        var aData = wave_data[i % wave_data.length];
        var bData = wave_data_s[i % wave_data_s.length];
        wave_data_s[i] = lerp(aData, bData, 0.75);
        freq += wave_data[i];
    }
    freq_data = Math.abs(freq/wave_data.length);
    
    checkBassHit();
}

function waveOnWindowResize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0,0,canvas.width, canvas.height);cgl();
}

function cgl(){
    if(disableSelfErrorReport) return;
    var err = gl.getError();
    if(err != gl.NO_ERROR){
        var errCode = "ERR_UNKNOWN";
        switch(err){
            case gl.INVALID_ENUM: errCode ="ERR_INVALID_ENUM"; break;
            case gl.INVALID_VALUE: errCode ="ERR_INVALID_VALUE"; break;
            case gl.INVALID_OPERATION: errCode ="ERR_INVALID_OPERATION"; break;
            case gl.INVALID_FRAMEBUFFER_OPERATION: errCode ="ERR_INVALID_FRAMEBUFFER_OPERATION"; break;
            case gl.OUT_OF_MEMORY: errCode ="ERR_OUT_OF_MEMORY"; break;
            case gl.CONTEXT_LOST_WEBGL: errCode ="ERR_CONTEXT_LOST_WEBGL"; break;
        }
        console.error(err, errCode);
    }
}

function glxCheckShader(s,isShader){
    var success = false;
    if(isShader) success = gl.getShaderParameter(s,gl.COMPILE_STATUS);
    else success = gl.getProgramParameter(s,gl.LINK_STATUS);
    cgl();

    if(success != 1){
        var info = "No Error";
        if(isShader) info = gl.getShaderInfoLog(s); else info = gl.getProgramInfoLog(s);
        console.error(info)
        cgl();
    }else{
        console.info(`Shader/Program is compiled ${s}`)
    }
}

function glxShaderSource(v,f){
    var prg = gl.createProgram();
    var sv = gl.createShader(gl.VERTEX_SHADER), sf = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(sv, v);cgl();
    gl.shaderSource(sf, f);cgl();
    gl.compileShader(sv); glxCheckShader(sv,true);cgl();
    gl.compileShader(sf); glxCheckShader(sf,true); cgl();
    gl.attachShader(prg, sf);cgl();
    gl.attachShader(prg, sv);cgl();
    gl.linkProgram(prg); glxCheckShader(prg, false);cgl();
    return prg;
}

function fillBgBuffer(){
    var bgvtxbuf = [
         -1,  1, 0.0,
          1,  1, 0.0,
         -1, -1, 1.0,
          1, -1, 1.0
        ];
    var bgidsbuf = [
        0,1,2,3
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, bg.vtb);cgl();
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bgvtxbuf), gl.DYNAMIC_DRAW);cgl();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bg.idb);cgl();
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(bgidsbuf), gl.DYNAMIC_DRAW);cgl();
}

function waveQueryLocs(obj, shader, names, isAttr){
    for(var i =0 ; i < names.length; i++){
        var name = names[i]
        obj[name] = isAttr ? gl.getAttribLocation(shader, name) : gl.getUniformLocation(shader, name);cgl();
    }
}

function waveQueryShaderLocation(){
    waveQueryLocs(bg, exeBg, ["POSITION","TEXCOORD0"], true);
    waveQueryLocs(bg, exeBg, ["_Month","_ColorA","_ColorB","_ColorC","_TimeOfDay","_UseTexture"], false);
    waveQueryLocs(wave, exeWv, ["POSITION"], true);
    waveQueryLocs(wave, exeWv, ["_Time","_XScale","_NormalStep","_Ortho","_ColorA","_ColorB","_RNGA","_RNGB","_RNGt"], false);
    waveQueryLocs(spark, exeVtx, ["POSITION","TIME"], true);
    waveQueryLocs(spark, exeVtx, ["_ScreenSize","_Color"], false);
}

function waveStart(){

    var uIntEl = gl.getExtension("OES_element_index_uint");
    if(uIntEl == null){
        throw Error("Browser's WebGL Implementation not supports GL_UNSIGNED_INT Vertex indices");
    }

    exeBg = glxShaderSource(background_v, background_f);cgl();
    exeWv = glxShaderSource(wave_v, wave_f);cgl();
    exeVtx = glxShaderSource(spark_v, spark_f);cgl();
    bg.vtb = gl.createBuffer();cgl();
    bg.idb = gl.createBuffer();cgl();
    wave.vtb = gl.createBuffer();cgl();
    wave.idb = gl.createBuffer();cgl();
    spark.vtb = gl.createBuffer();cgl();
    spark.idb = gl.createBuffer();cgl();
    fillBgBuffer();
    waveQueryShaderLocation();
    sparkInit(256);
    _RNGTime = 0.0;
    for(var i =0 ; i < _RNGDataCount;i++){
        _RNGDataA[i] = Math.random();
        _RNGDataB[i] = Math.random();
    }
}

function waveRenderBackground(){
    gl.disable(gl.CULL_FACE);cgl();
    gl.useProgram(exeBg);cgl();
    gl.uniform3f(bg._ColorA, color[0], color[1], color[2]);
    gl.uniform3f(bg._ColorB, -0.5, -0.5, -0.5);
    gl.uniform3f(bg._ColorC, 0.8, 0.8, 0.8);

    //var dTime = date.getHours() / 24.0;
    //dTime = (1 - Math.cos(dTime * Math.PI)) / 2;
    gl.uniform1f(bg._TimeOfDay, 0.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, bg.vtb);cgl();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bg.idb);cgl();

    gl.enableVertexAttribArray(bg.POSITION);cgl();
    gl.vertexAttribPointer(bg.POSITION, 3, gl.FLOAT, false, 3 * 4, 0 * 4);cgl();
    gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_INT, 0);cgl();
}

function waveWavePosNormalize(t){
    return ((t / (xmb_detail_size - 1.0)) * 2.0) - 1.0
}

function waveGenerateWaveBuffer(){
    // fill wave buffer
    var vtx_wave_vdata = [];
    var vtx_wave_index = [];

    var vx, vy;

    for (vy = 0; vy < xmb_detail_size; vy ++) {
        for (vx = 0; vx < xmb_detail_size; vx ++) {
            vtx_wave_vdata.push(waveWavePosNormalize(vx));
            //vtx_wave_vdata.push(1.0);
            var wavez = getWaveData(vx / xmb_detail_size, vy / xmb_detail_size);
            //vtx_wave_vdata.push(-Math.sin(Math.PI * (1.5 * wavez)));
            vtx_wave_vdata.push(wavez);
            vtx_wave_vdata.push(waveWavePosNormalize(vy));
            
        }
    }
    var count = 0;

    var ix, iy;
    for (iy = 0; iy < xmb_detail_size-1; iy++) {
        for (ix = 0; ix < xmb_detail_size -1; ix++) {
            var top = (iy * xmb_detail_size) + ix;
            var btm = ((iy+1) * xmb_detail_size) + ix;
            var a = top + 0, b = top + 1, c = btm + 0, d = btm + 1;
            vtx_wave_index.push(a, b, c, b, c, d);

            count += 6;
        }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, wave.vtb);cgl();
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtx_wave_vdata), gl.DYNAMIC_DRAW);cgl();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wave.idb);cgl();
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(vtx_wave_index), gl.DYNAMIC_DRAW);cgl();
    return count;
}

var _RNGDataCount = 10;
var _RNGDataA = [], _RNGDataB = [], _RNGTime = 0.0, _DeltaTime;
function checkRNGTUpdate(sendToGL){
    if(_RNGTime > 1.0){
        for(var i  =0; i < _RNGDataCount; i++){
            _RNGDataA[i] = _RNGDataB[i];
            _RNGDataB[i] = Math.random();
        }
        if(sendToGL){
            gl.uniform1fv(wave._RNGA, _RNGDataA);
            gl.uniform1fv(wave._RNGB, _RNGDataB);
        }

        _RNGTime = 0.0
    }
    _RNGTime += _DeltaTime;
    if(sendToGL){
        gl.uniform1f(wave._RNGt, _RNGTime);
    }
}

var wave_data_l = [],last_update_i = -1;
var do_color_hit_on_change= true;

function checkBassHit(){
    var mean = 0;
    var mean_s = 0;
	
	var hit_s = 0;
	var hit_l = 0;
	var hit_c = 0;
    for (let i = 0; i < wave_data.length; i++) {
        var t = wave_data_s[i] == undefined ? 0 : wave_data_s[i];
        wave_data_s[i] = lerp(t, wave_data[i], 0.25);
        mean += wave_data[i];
        mean_s += wave_data_s[i];
		
		var tcoef = Math.cos((i / wave_data.length) * (4 * Math.PI));
		tcoef = Math.max(tcoef, 1.0);
		hit_l += wave_data_l[i] * tcoef;
		hit_c += tcoef;
		hit_s += wave_data[i] * tcoef;
    }
	
    wave_mean = mean / wave_data.length;
    wave_mean_s = mean_s / wave_data_s.length;
	
	if(do_color_hit_on_change && (last_update_i != update_i)){
		hit_l = hit_l / hit_c;
		hit_s = hit_s / hit_c;
		var should_change = (hit_s - hit_l) > lerp(0.05, 0.1, wave_mean);
		
		if(should_change) {
			hit_change_index = (hit_change_index + 1) % colors.length;
		}
	}
	last_update_i = update_i;
    for(let i = 0; i < wave_data.length; i++){
        wave_data_l[i] =wave_data[i];
    }
}

function waveRenderWave(){
    gl.useProgram(exeWv);cgl();
    var elCount = waveGenerateWaveBuffer();
    gl.uniform1f(wave._Time, accelCTime);
    gl.uniform1f(wave._NormalStep, 0.01);
    gl.uniform1f(wave._XScale, canvas.width / 1280.0);
    gl.uniform4f(wave._ColorA, color[0], color[1], color[2], 1.0);
    gl.uniform4f(wave._ColorB, color[0], color[1], color[2], 0.1);
    checkRNGTUpdate(true);
    gl.bindBuffer(gl.ARRAY_BUFFER, wave.vtb);cgl();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wave.idb);cgl();
    gl.vertexAttribPointer(wave.POSITION, 3, gl.FLOAT, false, 3 * 4, 0 * 4);cgl();
    gl.enableVertexAttribArray(wave.POSITION);cgl();
    gl.drawElements(gl.TRIANGLES, elCount, gl.UNSIGNED_INT, 0);cgl();
}

function waveRenderSpark(){
    gl.useProgram(exeVtx);cgl();
    sparkMove(_DeltaTime);
    var count = sparkUpload(spark.vtb, spark.idb);cgl();
    gl.uniform2f(spark._ScreenSize, canvas.width, canvas.height);cgl();
    gl.uniform3f(spark._Color, color[0], color[1], color[2]);cgl();
    gl.vertexAttribPointer(spark.POSITION, 2, gl.FLOAT, false, 3 * 4, 0 * 4);cgl();
    gl.vertexAttribPointer(spark.TIME, 1, gl.FLOAT, false, 3 * 4, 2 * 4);cgl();
    gl.bindBuffer(gl.ARRAY_BUFFER, spark.vtb);cgl();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spark.idb);cgl();
    gl.enableVertexAttribArray(spark.POSITION);cgl();
    gl.enableVertexAttribArray(spark.TIME);cgl();
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);cgl();
}

function wpeSynthWave(){
    var waveData = [];
    for(var i = 0 ; i < 128; i++){
        waveData[i] = Math.sin((i / 32) + currentTime) * 0.5;
    }
    putVisData(waveData);
}

function waveRender(deltaMs){
    var delta = (deltaMs / 1000.0) - currentTime;
    currentTime = deltaMs / 1000.0;
    _DeltaTime = isNaN(delta) ? 0.016 : delta;
    if(isNaN(_RNGTime)) _RNGTime = 0.0;

    accelCTime += delta * lerp(2.0, 64.0, freq_data);

    if(isNaN(accelCTime)) accelCTime = 0.0;

    date = new Date();

    if(!isWPE){
        //wpeSynthWave();
    }
    color = colors[hit_change_index];

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);cgl();
    gl.clear(gl.COLOR_BUFFER_BIT);cgl();
    waveRenderBackground();cgl();
    waveRenderWave();cgl();
    waveRenderSpark();cgl();

    gl.disable(gl.BLEND);
    if(currentTime >= 60 * 60 * 24){
        currentTime = 0;
    }
    if(accelCTime >= 60 * 60 * 24){
        accelCTime = 0;
    }
    window.requestAnimationFrame(waveRender);
}

window.addEventListener("resize", () => { waveOnWindowResize(); });


waveOnWindowResize();

waveStart();
waveRender();

if(enableSpector){
    var dbg = new SPECTOR.Spector();
    dbg.displayUI();
}