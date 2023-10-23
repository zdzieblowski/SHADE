const config_defaults = {
    width: 320,
    height: 240,

    alpha: true,
    antialias: false,

    debug: false
};

export default class SHADE {
    version = '0.3.2';

    mouseX = 0;
    mouseY = 0;

    time = performance.now();
    
    constructor(canvas_element, config_override){
        this.config = {...config_defaults, ...config_override};

        this.canvas = document.getElementById(canvas_element);
        this.context = this.canvas.getContext('2d', {antialias: this.config.antialias, alpha: this.config.alpha})
        
        // 

        this.canvas2D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context2D = this.canvas2D.getContext('2d', {antialias: true, alpha: true});

        this.canvas3D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context3D = this.canvas3D.getContext('webgl2', {antialias: true, alpha: true});

        this.canvas.onmousemove = event => {
            this.mouseX = event.clientX - this.bcr.left;
            this.mouseY = event.clientY - this.bcr.top;
        }

        this.canvas.ontouchmove = event => {
            this.mouseX = event.changedTouches[0].clientX - this.bcr.left;
            this.mouseY = event.changedTouches[0].clientY - this.bcr.top;
        }

        window.onresize = event => {
            this.#resizeCanvas();
        }
    }

    // private methods

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
    }

    #loopRenderer() {        
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context3D.clear(this.context3D.COLOR_BUFFER_BIT);
       
        this.time = performance.now();        

        this.loop2D();

        this.context3D.uniform2f(this.ST_canvasResolution, this.canvas.width, this.canvas.height);
        this.context3D.uniform2f(this.ST_mousePosition, this.mouseX, this.mouseY);
        this.context3D.uniform1f(this.ST_currentTime, this.time * 0.001);
        this.loop3D();

        this.context.drawImage(this.canvas3D,0,0);
        this.context.drawImage(this.canvas2D,0,0);
        requestAnimationFrame(this.#loopRenderer.bind(this));
    }

    // public methods

    createShader(type, source) {
        let shader = this.context3D.createShader(type);
        
        this.context3D.shaderSource(shader, source);
        this.context3D.compileShader(shader);

        if (this.context3D.getShaderParameter(shader, this.context3D.COMPILE_STATUS)) {
            return shader;
        }            
        
        console.log(this.context3D.getShaderInfoLog(shader));
        this.context3D.deleteShader(shader);
    }

    createProgram(vertexShader, fragmentShader) {
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

    setup2D() {}
    loop2D() {}

    setup3D() {}
    loop3D() {}
    
    run() {
        this.setup2D();

        this.setup3D();
        this.ST_canvasResolution = this.context3D.getUniformLocation(this.program, 'iResolution');
        this.ST_mousePosition = this.context3D.getUniformLocation(this.program, 'iMouse');
        this.ST_currentTime = this.context3D.getUniformLocation(this.program, 'iTime');

        this.#resizeCanvas();
        setTimeout(() => { this.#loopRenderer(); }, 100);
    }
}