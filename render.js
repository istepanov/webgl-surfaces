var surfaceX = 10;
var surfaceY = 10;
var surfaceDelta = 1.0;

var canvas;
var gl;
var squareVerticesBuffer;
var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var indicesLength = 0;
var perspectiveMatrix;
var rotation = 1.0;
var lastRenderTime;

// ------------------------------------------------------------------------

function start() {
  canvas = document.getElementById("glcanvas");

  initWebGL(canvas);      // Initialize the GL context
  
  // Only continue if WebGL is available and working
  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
    
    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();
    
    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    initBuffers();
    
    // Set up to draw the scene periodically.
    setInterval(drawScene, 15);
  }
}

// ------------------------------------------------------------------------

function initWebGL() {
  gl = null;
  
  try {
    gl = canvas.getContext("experimental-webgl");
  }
  catch(e) {
  }
  
  // If we don't have a GL context, give up now
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
}

// ------------------------------------------------------------------------

function initBuffers() {
  // vertices
  /*var vertices = [
    -1.0,  1.0,  0.0,
    1.0, 1.0,  0.0,
    -1.0,  -1.0, 0.0,
    1.0, -1.0, 0.0,
  ];*/

  var vertices = [];
  var startX = -(surfaceX * surfaceDelta / 2.0);
  var startY = -(surfaceY * surfaceDelta / 2.0);

  for (var i = 0; i < surfaceY; i++) {
    for (var j = 0; j < surfaceX; j++) {
      vertices.push(startX + j * surfaceDelta, startY + i * surfaceDelta, 0.0);
    }
  }

  verticesBuffer = gl.createBuffer();  
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);      
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // indices
  var indices = [];
  for (var i = 0; i < surfaceY - 1; i++) {
    for (var j = 0; j < surfaceX - 1; j++) {
      indices.push(surfaceX * i + j, surfaceX * i + j + 1, surfaceX * (i + 1) + j);
      indices.push(surfaceX * i + j + 1, surfaceX * (i + 1) + j + 1, surfaceX * (i + 1) + j);
    }
  }

  indicesLength = indices.length;

  verticesIndexBuffer = gl.createBuffer();  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);  
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

// ------------------------------------------------------------------------

function drawScene() {
  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Establish the perspective with which we want to view the
  // scene. Our field of view is 45 degrees, with a width/height
  // ratio of 640:480, and we only want to see objects between 0.1 units
  // and 100 units away from the camera.
  perspectiveMatrix = makePerspective(45, 640.0/480.0, 0.1, 100.0);
  
  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  loadIdentity();
  
  // move the drawing position
  mvTranslate([-0.0, 0.0, -20.0]);

  // rotation
  var currentTime = (new Date).getTime();  
  if (lastRenderTime) {  
    var delta = currentTime - lastRenderTime;  
    rotation += (30 * delta) / 1000.0;  
  }  
  lastRenderTime = currentTime;

  // uniform variables
  gl.uniform1i(gl.getUniformLocation(gl.program, "uType"), 1);
  gl.uniform1f(gl.getUniformLocation(gl.program, "uDistortion"), 1.0);
  gl.uniform3f(gl.getUniformLocation(gl.program, "uLightPosition"), 0.85, 0.8, 0.75);
  gl.uniform3f(gl.getUniformLocation(gl.program, "uEyePosition"), 0.0, 0.0, 10.0);
  
  // vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);

  mvPushMatrix();  
  mvRotate(rotation, [1, 0, 1]);

  setMatrixUniforms();

  gl.drawElements(gl.TRIANGLES, indicesLength, gl.UNSIGNED_SHORT, 0);
  //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  mvPopMatrix(); 
}

// ------------------------------------------------------------------------

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");
  
  // Create the shader program
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  
  // If creating the shader program failed, alert
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }
  
  gl.useProgram(shaderProgram);
  
  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);
}

// ------------------------------------------------------------------------

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  
  // Didn't find an element with the specified ID; abort.
  if (!shaderScript) {
    return null;
  }
  
  // Walk through the source element's children, building the
  // shader source string.
  var theSource = "";
  var currentChild = shaderScript.firstChild;
  
  while(currentChild) {
    if (currentChild.nodeType == 3) {
      theSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
  
  // Now figure out what type of shader script we have,
  // based on its MIME type.
  var shader;
  
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;  // Unknown shader type
  }
  
  // Send the source to the shader object
  gl.shaderSource(shader, theSource);
  
  // Compile the shader program
  gl.compileShader(shader);
  
  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    return null;
  }
  
  return shader;
}

// ------------------------------------------------------------------------

function loadIdentity() {
  mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
  mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
  multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

function setMatrixUniforms() {
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));

  var normalMatrix = mvMatrix.inverse();
  normalMatrix = normalMatrix.transpose();
  var nUniform = gl.getUniformLocation(shaderProgram, "uNormalMatrix");
  gl.uniformMatrix4fv(nUniform, false, new Float32Array(normalMatrix.flatten()));
}

var mvMatrixStack = [];  
  
function mvPushMatrix(m) {  
  if (m) {  
    mvMatrixStack.push(m.dup());  
    mvMatrix = m.dup();  
  } else {  
    mvMatrixStack.push(mvMatrix.dup());  
  }  
}  
  
function mvPopMatrix() {  
  if (!mvMatrixStack.length) {  
    throw("Can't pop from an empty matrix stack.");  
  }  
    
  mvMatrix = mvMatrixStack.pop();  
  return mvMatrix;  
}  
  
function mvRotate(angle, v) {  
  var inRadians = angle * Math.PI / 180.0;  
    
  var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();  
  multMatrix(m);  
}  