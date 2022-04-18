class Particle{
    srcX = 0.0;
    srcY = 0.0;
    dstX = 0.0;
    dstY = 0.0;
    time = 0.0;
    speed = 0.0;
    srcS = 0.0;
    dstS = 0.0;
}

var particles = [];

function sparkAnimCurve(x){
    return 1 - Math.sin(Math.PI * x);
}

/**@param {Particle} p */
function sparkParticleInit(p){
    p.time = 0.0;
    p.srcX = Math.random();
    var yRange = 0.15 * sparkAnimCurve(p.srcX);
    p.srcY = 0.5 + lerp(-yRange, yRange, Math.random());
    var dir = Math.random() * (2 * Math.PI);
    var dist = lerp(0.05, 0.25, Math.random() * lerp(0.5, 1.0, sparkAnimCurve(p.srcX)));
    p.dstX = p.srcX + (Math.cos(dir) * dist);
    p.dstY = p.srcY + (Math.sin(dir) * dist);
    p.speed = lerp(0.001, 0.25, Math.random());
    p.srcS = lerp(0.001, 0.01, Math.random());
    p.dstS = p.srcS + lerp(0.001, 0.005 - p.srcS, Math.random());
}

/**@param {Particle} p */
function sparkParticleMove(p, time){
    p.time += time * (p.speed * lerp(1.0, 10.0, getWaveData(p.srcX, p.srcY)));
}

function sparkMove(time){
    for(var i =0 ; i < particles.length; i++){
        var p = particles[i];
        sparkParticleMove(p, time);
        if(p.time > 1.0){
            sparkParticleInit(p);
        }
    }
}

function sparkUpload(vtbuf, idbuf){
    gl.bindBuffer(gl.ARRAY_BUFFER, vtbuf);cgl();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idbuf);cgl();

    var count = 0, tri = 0;
    var refSz = Math.min(canvas.width, canvas.height);
    var vdata = [];
    var idata = [];

    for(var i =0 ; i < particles.length; i++){
        var p = particles[i];
        var sz = lerp(p.srcS, p.dstS, p.time);
        var posX = lerp(p.srcX, p.dstX, p.time);
        var posY = lerp(p.srcY, p.dstY, p.time);
        
        sz += getWaveData(posX, posY) * 0.01;
        var waveData= getWaveData(posX, posY);
        waveData = -Math.sin(Math.PI * (1.5 * waveData));
        posY -= waveData * 0.;

        sz = sz * refSz;
        posX = posX * canvas.width;
        posY = posY * canvas.height;

        var x = posX;
        var y = posY;
        var u = y - sz;
        var d = y + sz;
        var l = x - sz;
        var r = x + sz;
        var t = p.time;
        vdata.push(x,u,t);
        vdata.push(r,y,t);
        vdata.push(x,d,t);
        vdata.push(l,y,t);
        tri += 4;
        idata.push(tri + 0, tri + 1, tri + 3);
        idata.push(tri + 1, tri + 2, tri + 3);
        count += 4;
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vdata), gl.DYNAMIC_DRAW);cgl();
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(idata), gl.DYNAMIC_DRAW);cgl();
    return count;
}

function sparkInit(count){
    for(var i =0 ; i < count; i++){
            var p = new Particle();
            sparkParticleInit(p);
            p.time = Math.random();
            particles.push(p);
    }
}
