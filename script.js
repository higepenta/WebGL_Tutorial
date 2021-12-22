onload = function(){

  // Initialize
  let c = document.getElementById('canvas');
  c.width = 300;
  c.height = 300;

  let gl = c.getContext('webgl') || c.getContext('experimental-webgl')

  // MVP matrix
  let m = new matIV();
  let mMatrix = m.identity(m.create());
  let vMatrix = m.identity(m.create());
  let pMatrix = m.identity(m.create());
  let tmpMatrix = m.identity(m.create());
  let mvpMatrix = m.identity(m.create());
  let invMatrix = m.identity(m.create());

  // Eye Direction
  let eyeDirection = [0.0, 0.0, 20.0];

  // View matrix
  m.lookAt(eyeDirection, [0, 0, 0], [0, 1, 0], vMatrix);
  // Projection matrix
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);

  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // Light
  let lightPosition = [0.0, 0.0, 0.0];
  let ambientColor = [0.1, 0.1, 0.1, 0.1];

  // Create shader
  const v_shader = create_shader(gl, 'vs');
  const f_shader = create_shader(gl, 'fs');
  const prg = create_program(gl, v_shader, f_shader);

  // Attribute information
  const attLocation = { // index of attribute
    p : gl.getAttribLocation(prg, 'position'), 
    n : gl.getAttribLocation(prg, 'normal'),
    c : gl.getAttribLocation(prg, 'color')
  };

  const attStride = { // size of attribute 
    p : 3,
    n : 3,
    c : 4
  };

  // Create torus VBO/IBO
  const torusData = torus(32, 32, 1.0, 2.0);
  const torusVBOs = {
    p : create_vbo(gl, torusData.p),
    n : create_vbo(gl, torusData.n),
    c : create_vbo(gl, torusData.c),
  }
  const torusIBO = create_ibo(gl, torusData.i);

  // Create sphere VBO
  const sphereData = sphere(64, 64, 2.0, [0.25, 0.25, 0.75, 1.0]);
  const sphereVBOs = {
    p : create_vbo(gl, sphereData.p),
    n : create_vbo(gl, sphereData.n),
    c : create_vbo(gl, sphereData.c)
  };
  const sphereIBO = create_ibo(gl, sphereData.i);

  // uniform
  let uniLocation = new Array(5);
  uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prg, 'mMatrix');
  uniLocation[2] = gl.getUniformLocation(prg, 'invMatrix');
  uniLocation[3] = gl.getUniformLocation(prg, 'lightPosition');
  uniLocation[4] = gl.getUniformLocation(prg, 'eyeDirection');
  uniLocation[5] = gl.getUniformLocation(prg, 'ambientColor');

  // CULLING, DEPTH_TEST
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  let count = 0;

  (function(){
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    count++;

    const rad = (count % 360) * Math.PI / 180;
    const tx = Math.cos(rad) * 3.5;
    const ty = Math.sin(rad) * 3.5;
    const tz = Math.sin(rad) * 3.5;

    // ### Draw torus ###
    // Set VBO/IBO
    set_vbo_attributes(gl, torusVBOs, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIBO);

    // rotation
    m.identity(mMatrix);
    m.translate(mMatrix, [tx, -ty, -tz], mMatrix);
    m.rotate(mMatrix, -rad, [0, 1, 1], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // invmatrix
    m.inverse(mMatrix, invMatrix);

    // Register uniform
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.uniform3fv(uniLocation[3], lightPosition);
    gl.uniform3fv(uniLocation[4], eyeDirection);
    gl.uniform4fv(uniLocation[5], ambientColor);

    gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

    // ### Draw sphere ###
    // Set VBO/IBO
    set_vbo_attributes(gl, sphereVBOs, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIBO);

    // rotate 
    m.identity(mMatrix);
    m.translate(mMatrix, [-tx, ty, tz], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // Register uniform
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);

    gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

    // Draw
    gl.flush();

    setTimeout(arguments.callee, 1000 / 30);

  })();

  function sphere(row, column, radius, color){
    let pos = new Array();
    let nor = new Array();
    let col = new Array();
    let idx = new Array();

    for(let i = 0; i <= row; i++){
      let r = Math.PI / row * i;
      const ry = Math.cos(r);
      const rr = Math.sin(r);
      for(let ii = 0; ii <= column; ii++){
        const tr = Math.PI * 2 / column * ii;
        const rx = rr * Math.cos(tr);
        const rz = rr * Math.sin(tr);

        const tx = rx * radius;
        const ty = ry * radius;
        const tz = rz * radius;

        const tc = color ? color : hsva(360 / row * i, 1, 1, 1);
        
        pos.push(tx, ty, tz);
        nor.push(rx, ry, rz);
        col.push(tc[0], tc[1], tc[2], tc[3]);
			}
    }
    r = 0;
    for(i = 0; i < row ;i++){
      for(ii = 0; ii < column; ii++){
        r = (column + 1) * i + ii;
        idx.push(r, r + 1, r + column + 2);
        idx.push(r, r + column + 2, r + column + 1);
      }
    }
    return {p : pos, n : nor, c : col, i : idx};
  }

  function torus(row, column, irad, orad){
    let pos = new Array();
    let nor = new Array();
    let col = new Array();
    let idx = new Array();

    for(let i=0; i<=row; i++){
      let r = Math.PI * 2 / row * i;
      let rr = Math.cos(r);
      let ry = Math.sin(r);
      for(let ii = 0; ii <= column; ii++){
        let tr = Math.PI * 2 / column * ii;
        let tx = (rr * irad + orad) * Math.cos(tr);
        let ty = ry * irad;
        let tz = (rr * irad + orad) * Math.sin(tr);
        let rx = rr * Math.cos(tr);
        let rz = rr * Math.sin(tr);
        pos.push(tx, ty, tz);
        nor.push(rx, ry, rz);

        let tc = hsva(360/column * ii, 1, 1, 1);
        col.push(tc[0], tc[1], tc[2], tc[3]);
      }
    }

    for(i = 0; i < row; i++){
      for (ii = 0; ii < column; ii++){
        r = (column + 1) * i + ii;
        idx.push(r, r + column + 1, r + 1);
        idx.push(r + column + 1, r + column + 2, r + 1);
      }
    }
    
    return {p : pos, n : nor, c : col, i : idx};
  }

  function hsva(h, s, v, a){
    if (s > 1 || v > 1 || a > 1) return;
    let th = h % 360;
    let i = Math.floor(th / 60);
    let f = th / 60 - i;
    let m = v * (1 - s);
    let n = v * (1 - s * f);
    let k = v * (1 - s * (1 - f));
    let color = new Array();
    if (!s > 0 && !s < 0){
      color.push(v, v, v, a);
    }else{
      let r = new Array(v, n, m, m, k, v);
      let g = new Array(k, v, v, n, m, m);
      let b = new Array(m, m, k, v, v, n);
      color.push(r[i], g[i], b[i], a);
    }
    return color;
  }

  function create_shader(gl, id){
    let shader;
    const scriptElement = document.getElementById(id);
    if (!scriptElement) return;
  
    switch(scriptElement.type){
      case 'x-shader/x-vertex':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
      case 'x-shader/x-fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default:
        return;
    }
  
    gl.shaderSource(shader, scriptElement.text);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      return shader;
    }else{
      alert(gl.getShaderInfoLog(shader));
    }
  }
  
  function create_program(gl, vs, fs){
    let program = gl.createProgram();
  
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
  
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)){
      gl.useProgram(program);
      return program;
    }else{
      alert(gl.getProgramInfoLog(program));
    }
  }
  
  function create_vbo(gl, data){
    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  function create_set_vbo(gl, data, attLocation, attStride){
    const vbo = create_vbo(gl, data)
    set_vbo_attribute(gl, vbo, attLocation, attStride);
  }

  function set_vbo_attribute(gl, vbo, attLocation, attStride){
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.enableVertexAttribArray(attLocation);
    gl.vertexAttribPointer(attLocation, attStride, gl.FLOAT, false, 0, 0);
  }

  function set_vbo_attributes(gl, vbos, attLocations, attStrides){
    set_vbo_attribute(gl, vbos.p, attLocations.p, attStrides.p);
    set_vbo_attribute(gl, vbos.c, attLocations.c, attStrides.c);
    set_vbo_attribute(gl, vbos.n, attLocations.n, attStrides.n);
  }

  function create_set_ibo(gl, index){
    const ibo = create_ibo(gl, index);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  }

  function create_ibo(gl, data){
    let ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
  }
};