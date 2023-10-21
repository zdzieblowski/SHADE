const config_defaults = {
    width: 320,
    height: 240,

    alpha: true,
    antialias: false,

    fragment_glsl: ``,

    vertex_array: [ -1, -1,  1, -1,  1,  1, -1,  1, -1, -1,  1,  1 ],
    vertex_glsl: `attribute vec4 _vertices; void main() { gl_Position = _vertices; }`,

    debug: false
};

export default class SHADE {
    version = '0.3.1';

    mouseX = 0;
    mouseY = 0;

    time = performance.now();

    vertexDimensions = 2;
    
    // 

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

        this.program = this.#createProgram(this.#createShader(this.context3D.VERTEX_SHADER, this.config.vertex_glsl), this.#createShader(this.context3D.FRAGMENT_SHADER, this.config.fragment_glsl));

        this.context3D.useProgram(this.program);

        //
        this.vertexArray = this.context3D.getAttribLocation(this.program, '_vertices');

        // Shadertoy compatibility
        this.ST_canvasResolution = this.context3D.getUniformLocation(this.program, 'iResolution');
        this.ST_mousePosition = this.context3D.getUniformLocation(this.program, 'iMouse');
        this.ST_currentTime = this.context3D.getUniformLocation(this.program, 'iTime');

        // 

        this.context3D.bindBuffer(this.context3D.ARRAY_BUFFER, this.context3D.createBuffer());
        this.context3D.bufferData(this.context3D.ARRAY_BUFFER, new Float32Array(this.config.vertex_array), this.context3D.STATIC_DRAW);
        this.context3D.enableVertexAttribArray(this.vertexArray);
        this.context3D.vertexAttribPointer(this.vertexArray, this.vertexDimensions, this.context3D.FLOAT, false, 0, 0);

        //

        this.#resizeCanvas();
        setTimeout(() => { this.#loopRenderer(); }, 100);

        //

        this.canvas.onmousemove = event => {
            let bcr = this.canvas.getBoundingClientRect();

            this.mouseX = event.clientX - bcr.left;
            this.mouseY = event.clientY - bcr.top;
        }

        this.canvas.ontouchmove = event => {
            let bcr = this.canvas.getBoundingClientRect();

            this.mouseX = event.changedTouches[0].clientX - bcr.left;
            this.mouseY = event.changedTouches[0].clientY - bcr.top;
        }

        window.onresize = event => {
            this.#resizeCanvas();
        }
    }

    // private methods

    #createShader(type, source) {
        let shader = this.context3D.createShader(type);
        this.context3D.shaderSource(shader, source);
        this.context3D.compileShader(shader);
        if (this.context3D.getShaderParameter(shader, this.context3D.COMPILE_STATUS)) {
            return shader;
        }            
        console.log(this.context3D.getShaderInfoLog(shader));
        this.context3D.deleteShader(shader);
    }

    #createProgram(vertexShader, fragmentShader) {
        let program = this.context3D.createProgram();
        this.context3D.attachShader(program, vertexShader);
        this.context3D.attachShader(program, fragmentShader);
        this.context3D.linkProgram(program);
        if (this.context3D.getProgramParameter(program, this.context3D.LINK_STATUS)) {
            return program;
        }            
        console.log(this.context3D.getProgramInfoLog(program));
        this.context3D.deleteProgram(program);
    }

    #parseSize(input) {
        return parseInt(input) ? parseInt(input) : {
            'maxWidth': this.canvas.parentElement.clientWidth,
            'maxHeight': this.canvas.parentElement.clientHeight
        }[input];
    }

    #resizeCanvas() {
        this.canvas2D.width = this.canvas3D.width = this.canvas.width = this.#parseSize(this.config.width);
        this.canvas2D.height = this.canvas3D.height = this.canvas.height = this.#parseSize(this.config.height);

        this.context3D.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    #loopRenderer(){        
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.context2D.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.context3D.clear(this.context3D.COLOR_BUFFER_BIT);
        
        // 
        
        this.time = performance.now();        

        this.context3D.uniform2f(this.ST_canvasResolution, this.canvas.width, this.canvas.height);
        this.context3D.uniform2f(this.ST_mousePosition, this.mouseX, this.mouseY);
        this.context3D.uniform1f(this.ST_currentTime, this.time * 0.001);

        this.context3D.drawArrays(this.context3D.TRIANGLES, 0, this.config.vertex_array.length/this.vertexDimensions);

        // 

        this.algorithm2D();
        this.algorithm3D();

        // 
        
        this.context.drawImage(this.canvas3D,0,0);
        this.context.drawImage(this.canvas2D,0,0);

        requestAnimationFrame(this.#loopRenderer.bind(this));
    }

    // public methods

    algorithm2D() {
    }

    algorithm3D() {
    }
}