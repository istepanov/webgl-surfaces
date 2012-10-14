var countX = 150;
var countY = 150;

var surfaces = [
  { id: 1, name: "Spiral Twisted Cylinder", xmin: -3.142, xmax: 3.142,  ymin: -3.142, ymax: 3.142 },
  { id: 2, name: "No Name",                 xmin: -3.142, xmax: 3.142,  ymin: -3.142, ymax: 3.142 },
  { id: 3, name: "Modified Sphere",         xmin: -3.142, xmax: 3.142,  ymin: -3.142, ymax: 3.142 },
  { id: 4, name: "Cone Spiral",             xmin: -1.0,   xmax: 1.0,    ymin: -1.0,   ymax: 1.0   },
  { id: 5, name: "Bohemian Dome",           xmin: -6.29,  xmax: 6.29,   ymin: -6.29,  ymax: 6.29 },
  { id: 6, name: "Möbius Strip",            xmin: 0,      xmax: 6.34,   ymin: -0.3,   ymax: 0.3   },
  { id: 7, name: "Astroidal Ellipse",       xmin: 0,      xmax: 6.29,   ymin: 0,      ymax: 6.29  },
];

var gl;
var squareVerticesBuffer;
var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var indicesLength = 0;
var perspectiveMatrix;

var state = {
  rotationX: 0.0,
  rotationY: 0.0,
  rotationSpeed: 0.3,
  eyeZ: 5.0,
  morphing: 0.0,
  morphingAnimation: true,
  surface: surfaces[0],
  lastRenderTime: null,
  lastMouseX: null,
  lastMouseY: null,
  mouseDown: false
};

var ui = {
  init: function () {
    this.canvas = $("#glcanvas")[0];
    this.morphing = $("#morphing")[0];
    this.surface = $("#surface")[0];
    this.animationButton = $("#animation-button")[0];
    this.aboutButton = $("#about-button")[0];
    this.about = $("#panel .item.about")[0];

    for (var i in surfaces) {
      var option = document.createElement('option');
      option.value = surfaces[i].id;
      option.text = surfaces[i].name;
      this.surface.add(option);
    }

    this.surface.onchange = this.onSurfaceChange;
    this.morphing.onchange = this.onMorphingChange;
    this.animationButton.onclick = this.onAnimationButtonClick;
    this.aboutButton.onclick = this.onAboutButtonClick;
    this.canvas.onmousedown = this.onMouseDown;
    this.canvas.onmouseup = this.onMouseUp;
    this.canvas.onmousemove = this.onMouseMove;
    this.canvas.onmousewheel = this.onMouseWheel;
    window.onresize = this.onWindowResize;
  },
  onMouseDown: function() {
    state.mouseDown = true;
    state.lastMouseX = event.clientX;
    state.lastMouseY = event.clientY;
  },
  onMouseUp: function() {
    state.mouseDown = false;
  },
  onMouseMove: function() {
    if (state.mouseDown)
    {
      if (!state.lastMouseX || !state.lastMouseY) {
        state.lastMouseX = event.clientX;
        state.lastMouseY = event.clientY;
        return;
      }
      var newX = event.clientX;
      var newY = event.clientY;
      state.rotationX += state.rotationSpeed * (newX - state.lastMouseX);
      state.rotationY += state.rotationSpeed * (newY - state.lastMouseY);
      state.lastMouseX = newX
      state.lastMouseY = newY;
    }
  },
  onMouseWheel: function() {
    state.eyeZ += event.wheelDeltaY / 50.0;
    if (state.eyeZ < 1.0)
      state.eyeZ = 1.0;
    else if (state.eyeZ > 20.0)
      state.eyeZ = 20.0;
    event.preventDefault()
  },
  onSurfaceChange: function() {
    clearInterval(mainTimer);
    state.surface = surfaces[ui.surface.value - 1];
    state.morphing = 0.0;
    state.morphingAnimation = true;
    ui.animationButton.value = "Stop animation"
    ui.morphing.value = 0.0;
    state.rotationX = 0.0;
    state.rotationY = 0.0;
    initBuffers();
    mainTimer = setInterval(drawScene, 15);
  },
  onMorphingChange: function() {
    state.morphing = ui.morphing.value / 100.0;
  },
  onAnimationButtonClick: function() {
    if (state.morphingAnimation) {
      state.morphingAnimation = false;
      ui.animationButton.value = "Start animation"
    }
    else {
      if (state.morphing == 1.0) state.morphing = 0.0;
      state.morphingAnimation = true;
      ui.animationButton.value = "Stop animation"
    }
  },
  onWindowResize: function() {
    ui.canvas.width = window.innerWidth;
    ui.canvas.height = window.innerHeight;
  },
  onAboutButtonClick: function() {
    $(ui.about).toggleClass('collapsed');
  }
};

// ------------------------------------------------------------------------

function start() {
  ui.init();
  ui.onWindowResize();

  // initialize the GL context
  initWebGL();      
  
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
    mainTimer = setInterval(drawScene, 15);
  }
}

// ------------------------------------------------------------------------

function initWebGL() {
  gl = null;
  
  try {
    gl = ui.canvas.getContext("experimental-webgl");
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
  var vertices = [];

  var deltaX = (state.surface.xmax - state.surface.xmin) / countX;
  var deltaY = (state.surface.ymax - state.surface.ymin) / countY;

  for (var i = 0; i < countY; i++) {
    for (var j = 0; j < countX; j++) {
      vertices.push(state.surface.xmin + j * deltaX, state.surface.ymin + i * deltaY, 0.0);
    }
  }

  verticesBuffer = gl.createBuffer();  
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);      
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // indices
  var indices = [];
  for (var i = 0; i < countY - 1; i++) {
    for (var j = 0; j < countX - 1; j++) {
      indices.push(countX * i + j, countX * i + j + 1, countX * (i + 1) + j);
      indices.push(countX * i + j + 1, countX * (i + 1) + j + 1, countX * (i + 1) + j);
    }
  }

  indicesLength = indices.length;

  verticesIndexBuffer = gl.createBuffer();  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);  
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

// ------------------------------------------------------------------------

function drawScene() {
  // set the viewport
  gl.viewport(0, 0, ui.canvas.width, ui.canvas.height);

  // clear the canvas before drawing
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // establish the perspective
  perspectiveMatrix = makePerspective(45, ui.canvas.width/ui.canvas.height, 0.1, 100.0);
  
  // Set the drawing position to the "identity" point (the center of the scene)
  loadIdentity();
  
  // move the drawing position
  mvTranslate([-0.0, 0.0, -state.eyeZ]);

  // animation
  if (state.morphingAnimation)
  {
    var currentTime = (new Date).getTime();  
    if (state.lastRenderTime) {  
      var delta = currentTime - state.lastRenderTime;  
      state.morphing += delta / 10000.0;
      if (state.morphing > 1.0) {
        state.morphing = 1.0;
        state.morphingAnimation = false;
        ui.animationButton.value = "Start animation";
      }
      ui.morphing.value = state.morphing * 100;
    }  
    state.lastRenderTime = currentTime;
  }
  else
  {
    state.lastRenderTime = null;
  }

  // uniform variables
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSurface"), state.surface.id);
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "uMorphing"), state.morphing);
  gl.uniform3f(gl.getUniformLocation(shaderProgram, "uLightPosition"), 0.0, 0.0, state.eyeZ);
  gl.uniform3f(gl.getUniformLocation(shaderProgram, "uEyePosition"), 0.0, 0.0, state.eyeZ);
  
  // vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, verticesIndexBuffer);

  mvPushMatrix();

  var matrixRotateX = Matrix.RotationX(state.rotationY * Math.PI / 180.0).ensure4x4();
  var matrixRotateY = Matrix.RotationY(state.rotationX * Math.PI / 180.0).ensure4x4();

  multMatrix(matrixRotateX);
  multMatrix(matrixRotateY);

  setMatrixUniforms();

  gl.drawElements(gl.TRIANGLES, indicesLength, gl.UNSIGNED_SHORT, 0);

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
    console.log("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
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