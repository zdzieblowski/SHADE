const config_defaults = {
    width: 320,
    height: 240,

    alpha: true,
    antialias: false,

    is_shader_toy: false,

    debug: false
};

export default class SHADE {

    version = '0.3.5';

    mouseX = 0;
    mouseY = 0;

    time = performance.now();

    o2E = true;
    o3E = true;
    l2E = true;
    l3E = true;
    
    //

    
    //

    fragment_shader = ``;
    vertex_shader = ``;
    
    constructor(canvas_element, config_override){
        this.config = {...config_defaults, ...config_override};

        this.canvas = document.getElementById(canvas_element);
        this.context = this.canvas.getContext('2d', {antialias: this.config.antialias, alpha: this.config.alpha})
        
        // 

        this.canvas2D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context2D = this.canvas2D.getContext('2d', {antialias: true, alpha: true});

        this.canvas3D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context3D = this.canvas3D.getContext('webgl2', {antialias: true, alpha: true});

        // 

        this.canvas.onmousemove = event => {
            this.mouseX = event.clientX - this.bcr.left;
            this.mouseY = event.clientY - this.bcr.top;
        }

        this.canvas.ontouchmove = event => {
            this.mouseX = event.changedTouches[0].clientX - this.bcr.left;
            this.mouseY = event.changedTouches[0].clientY - this.bcr.top;
        }

        window.onresize = event => { this.#resizeCanvas(); }

        // 

        this.ST_vertex_shader = `attribute vec4 _vertices; void main() { gl_Position = _vertices; }`;

        this.ST_once3D = function() {
            this.program = this.createProgram(this.createShader(this.context3D.VERTEX_SHADER, this.vertex_shader), this.createShader(this.context3D.FRAGMENT_SHADER, this.fragment_shader));
            this.context3D.useProgram(this.program);

            this.vertexData = [ -1, -1, +1, -1, +1, +1, -1, +1, -1, -1, +1, +1 ];

            this.vertexArray = this.context3D.getAttribLocation(this.program, '_vertices');
            this.context3D.bindBuffer(this.context3D.ARRAY_BUFFER, this.context3D.createBuffer());
            this.context3D.bufferData(this.context3D.ARRAY_BUFFER, new Float32Array(this.vertexData), this.context3D.STATIC_DRAW);
            this.context3D.enableVertexAttribArray(this.vertexArray);
            this.context3D.vertexAttribPointer(this.vertexArray, 2, this.context3D.FLOAT, false, 0, 0);  
            this.ST_canvasResolution = this.context3D.getUniformLocation(this.program, 'iResolution');
            this.ST_mousePosition = this.context3D.getUniformLocation(this.program, 'iMouse');
            this.ST_currentTime = this.context3D.getUniformLocation(this.program, 'iTime');
        }

        this.ST_loop3D = function() {
            this.context3D.uniform2f(this.ST_canvasResolution, this.canvas.width, this.canvas.height);
            this.context3D.uniform2f(this.ST_mousePosition, this.mouseX, this.mouseY);
            this.context3D.uniform1f(this.ST_currentTime, this.time * 0.001);
            this.context3D.drawArrays(this.context3D.TRIANGLES, 0, this.vertexData.length/2);
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

        this.bcr = this.canvas.getBoundingClientRect()

        this.context3D.viewport(0, 0, this.canvas.width, this.canvas.height);

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

        if(this.config.is_shader_toy == true) {

            this.vertex_shader = this.ST_vertex_shader;
            this.once3D = this.ST_once3D;
            this.loop3D = this.ST_loop3D;

            this.fragment_shader = `
                precision highp float;
                uniform vec2 iResolution;
                uniform vec2 iMouse;
                uniform float iTime;`
            + this.fragment_shader + `
                void main() {
                    mainImage(gl_FragColor, gl_FragCoord.xy);
                }`;
        }

        //

        this.o2E = this.once2D.toString() == this.empty.toString();
        this.o3E = this.once3D.toString() == this.empty.toString();
        this.l2E = this.loop2D.toString() == this.empty.toString();
        this.l3E = this.loop3D.toString() == this.empty.toString();
                
        this.once2D();
        this.once3D();
        setTimeout(() => { this.#loopRenderer(); }, 100);
    }
}