const config_defaults = {
    width: 320,
    height: 240,

    alpha: false,
    alpha2D: true,
    alpha3D: false,

    antialias: false,
    antialias2D: false,
    antialias3D: false,

    api3D: 'webgl2',

    is_shadertoy: false,

    debug: false
};

export default class SHADE {
    version = '0.3.9';

    mouseX = 0;
    mouseY = 0;
    mouseZ = 0;
    mouseW = 0;
    mouseDown = false;

    time = performance.now();
    frame = 0;

    l2E = true;
    l3E = true;

    //

    fragment_shader = ``;
    vertex_shader = ``;
    
    constructor(canvas_element, config_override){
        this.config = {...config_defaults, ...config_override};

        this.canvas = document.getElementById(canvas_element);
        this.context = this.canvas.getContext('2d', {antialias: this.config.antialias, alpha: this.config.alpha})
        
        this.shadertoy = this.config.is_shadertoy == true;

        // 

        this.canvas2D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context2D = this.canvas2D.getContext('2d', {antialias: this.config.antialias2D, alpha: this.config.alpha2D});

        this.canvas3D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context3D = this.canvas3D.getContext(this.config.api3D, {antialias: this.config.antialias3D, alpha: this.config.alpha3D});

        // 

        this.canvas.onmousemove = event => {
            this.bcr = this.canvas.getBoundingClientRect();
            if(!this.config.is_shadertoy) {
                this.mouseX = event.clientX - this.bcr.left;
                this.mouseY = event.clientY - this.bcr.top;
            } else {
                if(this.mouseDown){
                    this.mouseX = event.clientX - this.bcr.left;
                    this.mouseY = this.bcr.bottom - event.clientY;
                }
            }
        }

        this.canvas.onmousedown = event => {
            this.bcr = this.canvas.getBoundingClientRect();
            this.mouseDown = true;
            this.mouseX = this.mouseZ = event.clientX - this.bcr.left;
            this.mouseY = this.mouseW = this.bcr.bottom - event.clientY;            
        }

        this.canvas.onmouseup = event => {
            this.mouseDown = false;
            this.mouseZ = 0;
            this.mouseW = 0;
        }

        const resizeEvent = new ResizeObserver((entries) => {
            this.#resizeCanvas();
        });

        resizeEvent.observe(this.canvas.parentElement);

        // 

        this.ST_vertex_shader = `#version 300 es
        in vec4 _vertices;
        void main() { gl_Position = _vertices; }`;

        this.ST_once3D = function() {
            this.program = this.createProgram(this.createShader(this.context3D.VERTEX_SHADER, this.vertex_shader), this.createShader(this.context3D.FRAGMENT_SHADER, this.fragment_shader));
            this.context3D.useProgram(this.program);

            this.vertexData = [ -1,-1,+1,-1,+1,+1,-1,+1,-1,-1,+1,+1 ];

            this.vertexArray = this.context3D.getAttribLocation(this.program, '_vertices');
            this.context3D.bindBuffer(this.context3D.ARRAY_BUFFER, this.context3D.createBuffer());
            this.context3D.bufferData(this.context3D.ARRAY_BUFFER, new Float32Array(this.vertexData), this.context3D.STATIC_DRAW);
            this.context3D.enableVertexAttribArray(this.vertexArray);
            this.context3D.vertexAttribPointer(this.vertexArray, 2, this.context3D.FLOAT, false, 0, 0);  
            this.ST_canvasResolution = this.context3D.getUniformLocation(this.program, 'iResolution');
            this.ST_mousePosition = this.context3D.getUniformLocation(this.program, 'iMouse');
            this.ST_currentTime = this.context3D.getUniformLocation(this.program, 'iTime');
            this.ST_currentFrame = this.context3D.getUniformLocation(this.program, 'iFrame');
        }

        this.ST_loop3D = function() {
            this.context3D.uniform3f(this.ST_canvasResolution, this.canvas.width, this.canvas.height, 1.0);
            this.context3D.uniform4f(this.ST_mousePosition, this.mouseX, this.mouseY, this.mouseZ, this.mouseW);
            this.context3D.uniform1f(this.ST_currentTime, this.time * 0.001);
            this.context3D.uniform1i(this.ST_currentFrame, this.frame);
            this.context3D.drawArrays(this.context3D.TRIANGLES, 0, this.vertexData.length/2);
            this.frame++;
        }

        //

        this.empty = function() {}
    
        this.once2D = function() {}        
        this.loop2D = function() {}

        this.once3D = function() {}
        this.loop3D = function() {}
    }

    //

    #parseSize(input) {
        return parseInt(input) ? parseInt(input) : {
            'maxWidth': this.canvas.parentElement.clientWidth,
            'maxHeight': this.canvas.parentElement.clientHeight
        }[input];
    }

    #resizeCanvas() {
        this.canvas2D.width = this.canvas3D.width = this.canvas.width = this.#parseSize(this.config.width);
        this.canvas2D.height = this.canvas3D.height = this.canvas.height = this.#parseSize(this.config.height);

        this.bcr = this.canvas.getBoundingClientRect();
        
        this.context3D.viewport(0, 0, this.canvas.width, this.canvas.height);

        if(this.shadertoy) {
            this.mouseX = this.canvas.width/2;
            this.mouseY = this.canvas.height/2;
        }

        if(this.l2E) {
            this.once2D();
        }

        if(this.l3E) {
            this.once3D();
        }
    }

    #loopRenderer() {
        if(!this.l2E){
            this.context2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.loop2D();
        }

        if(!this.l3E){
            this.loop3D();
        }

        this.time = performance.now();        

        this.context.drawImage(this.canvas3D, 0, 0);
        this.context.drawImage(this.canvas2D, 0, 0);

        if(!this.l2E || !this.l3E) {
            requestAnimationFrame(this.#loopRenderer.bind(this));
        }
    }

    //

    async loadShader(shader_filename) {
        let shader_data = await fetch(shader_filename);
        return shader_data.text();
    }

    createShader(shader_type, shader_source) {
        let shader = this.context3D.createShader(shader_type);

        this.context3D.shaderSource(shader, shader_source);
        this.context3D.compileShader(shader);

        if (this.context3D.getShaderParameter(shader, this.context3D.COMPILE_STATUS)) {
            return shader;
        }            
        
        console.log(this.context3D.getShaderInfoLog(shader));
        this.context3D.deleteShader(shader);
    }

    createProgram(vertex_shader, fragment_shader) {
        let program = this.context3D.createProgram();
        
        this.context3D.attachShader(program, vertex_shader);
        this.context3D.attachShader(program, fragment_shader);
        this.context3D.linkProgram(program);
        
        if (this.context3D.getProgramParameter(program, this.context3D.LINK_STATUS)) {
            return program;
        }            
        
        console.log(this.context3D.getProgramInfoLog(program));
        this.context3D.deleteProgram(program);
    }

    //
    
    run() {
        this.#resizeCanvas();

        //

        if(this.shadertoy) {            
            this.vertex_shader = this.ST_vertex_shader;
            this.once3D = this.ST_once3D;
            this.loop3D = this.ST_loop3D;

            this.fragment_shader = `#version 300 es

            #define HW_PERFORMANCE 1

            precision highp float;
            precision highp int;
            precision highp sampler2D;

            out vec4 outColor;
            
            uniform vec3 iResolution;
            uniform vec4 iMouse;
            uniform float iTime;
            uniform int iFrame;
            `
            + this.fragment_shader + `
            void main() {
                vec4 color = vec4(1e20);
                mainImage( color, gl_FragCoord.xy );
                outColor = color;
            }`;
        }

        //

        this.l2E = this.loop2D.toString() == this.empty.toString();
        this.l3E = this.loop3D.toString() == this.empty.toString();

        this.once2D();
        this.once3D();

        this.#loopRenderer();
    }
}
