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
    version = '0.3.16';

    mouse = [0,0,0,0];
    mouseDown = false;

    time = performance.now();
    frame = 0;
    prev_date = new Date();

    l2E = false;
    l3E = false;

    //

    fragment_shader = ``;
    vertex_shader = ``;

    constructor(canvas_element, config_override) {
        this.config = { ...config_defaults, ...config_override };

        this.canvas = document.getElementById(canvas_element);
        this.context = this.canvas.getContext('2d', { antialias: this.config.antialias, alpha: this.config.alpha })

        // 

        this.canvas2D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context2D = this.canvas2D.getContext('2d', { antialias: this.config.antialias2D, alpha: this.config.alpha2D });

        this.canvas3D = new OffscreenCanvas(this.canvas.width, this.canvas.height);
        this.context3D = this.canvas3D.getContext(this.config.api3D, { antialias: this.config.antialias3D, alpha: this.config.alpha3D });

        // 

        this.canvas.onmousemove = event => {
            this.bcr = this.canvas.getBoundingClientRect();
            if (!this.config.is_shadertoy) {
                this.mouse[0] = event.clientX - this.bcr.left;
                this.mouse[1] = event.clientY - this.bcr.top;
            } else {
                if (this.mouseDown) {
                    this.mouse[0] = event.clientX - this.bcr.left;
                    this.mouse[1] = this.bcr.bottom - event.clientY;
                }
            }
        }

        this.canvas.onmousedown = event => {
            this.bcr = this.canvas.getBoundingClientRect();
            this.mouseDown = true;

            if (this.config.is_shadertoy) {
                this.mouseSignalDown = true;
            }

            this.mouse[0] = this.mouse[2] = event.clientX - this.bcr.left;
            this.mouse[1] = this.mouse[3] = this.bcr.bottom - event.clientY;
        }

        this.canvas.onmouseup = event => {
            this.mouseDown = false;
            if (!this.config.is_shadertoy) {
                this.mouse[2] = 0;
                this.mouse[3] = 0;
            }
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
            this.fragment_shader = `#version 300 es

            #define HW_PERFORMANCE 1

            precision highp float;
            precision highp int;
            precision highp sampler2D;

            out vec4 outColor;

            uniform vec4 iDate;
            uniform int iFrame;
            uniform float iFrameRate;
            uniform vec4 iMouse;
            uniform vec3 iResolution;
            uniform float iTime;
            uniform float iTimeDelta;
            `
            + this.fragment_shader + `
            void main() {
                vec4 color = vec4(1e20);
                mainImage( color, gl_FragCoord.xy );
                outColor = color;
            }`;
            
            this.program = this.createProgram(this.createShader(this.context3D.VERTEX_SHADER, this.vertex_shader), this.createShader(this.context3D.FRAGMENT_SHADER, this.fragment_shader));
            this.context3D.useProgram(this.program);
            this.vertexData = [-1, -1, 1, -1, 1, 1, -1, 1, -1, -1, 1, 1];
            this.vertexArray = this.context3D.getAttribLocation(this.program, '_vertices');
            this.context3D.bindBuffer(this.context3D.ARRAY_BUFFER, this.context3D.createBuffer());
            this.context3D.bufferData(this.context3D.ARRAY_BUFFER, new Float32Array(this.vertexData), this.context3D.STATIC_DRAW);
            this.context3D.enableVertexAttribArray(this.vertexArray);
            this.context3D.vertexAttribPointer(this.vertexArray, 2, this.context3D.FLOAT, false, 0, 0);
            this.ST_currentDate = this.context3D.getUniformLocation(this.program, 'iDate');
            this.ST_currentFrame = this.context3D.getUniformLocation(this.program, 'iFrame');
            this.ST_currentFrameRate = this.context3D.getUniformLocation(this.program, 'iFrameRate');
            this.ST_mousePosition = this.context3D.getUniformLocation(this.program, 'iMouse');
            this.ST_canvasResolution = this.context3D.getUniformLocation(this.program, 'iResolution');
            this.ST_currentTime = this.context3D.getUniformLocation(this.program, 'iTime');
            this.ST_currentTimeDelta = this.context3D.getUniformLocation(this.program, 'iTimeDelta');
        }

        this.ST_loop3D = function() {
            this.mouse[2] = Math.abs(this.mouse[2]);
            this.mouse[3] = Math.abs(this.mouse[3]);

            if (!this.mouseDown) {
                this.mouse[2] = -this.mouse[2];
            }

            if (!this.mouseSignalDown) {
                this.mouse[3] = -this.mouse[3];
            }

            this.mouseSignalDown = false;

            let date = new Date();
            let delta = date - this.prev_date;
            this.context3D.uniform4f(this.ST_currentDate, date.getFullYear(), date.getMonth(), date.getDate(), (date.getHours() * 3600. + date.getMinutes() * 60. + date.getSeconds() + date.getMilliseconds() / 1000.))
            this.context3D.uniform1i(this.ST_currentFrame, this.frame);
            this.context3D.uniform1f(this.ST_currentFrameRate, 1000. / delta);
            this.context3D.uniform4f(this.ST_mousePosition, this.mouse[0], this.mouse[1], this.mouse[2], this.mouse[3]);
            this.context3D.uniform3f(this.ST_canvasResolution, this.canvas.width, this.canvas.height, 1.0);
            this.context3D.uniform1f(this.ST_currentTime, this.time * 0.001);
            this.context3D.uniform1f(this.ST_currentTimeDelta, delta * 0.001);
            this.context3D.drawArrays(this.context3D.TRIANGLES, 0, this.vertexData.length / 2);
            this.frame++;
            this.prev_date = date;
        }

        //

        this.empty  = function() {}
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

        if (this.config.is_shadertoy) {
            this.mouse[0] = 0;
            this.mouse[1] = 0;
        }

        if (!this.l2E) {
            this.once2D();
        }

        if (!this.l3E) {
            this.once3D();
        }
    }

    #loopRenderer() {
        if (this.l2E) {
            this.context2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.loop2D();
        }

        if (this.l3E) {
            this.loop3D();
        }

        this.time = performance.now();

        this.context.drawImage(this.canvas3D, 0, 0);
        this.context.drawImage(this.canvas2D, 0, 0);

        if (this.l2E || this.l3E) {
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

        if (this.config.is_shadertoy) {
            this.vertex_shader = this.ST_vertex_shader;
            this.once3D = this.ST_once3D;
            this.loop3D = this.ST_loop3D;
        }

        //

        this.l2E = this.loop2D.toString() != this.empty.toString();
        this.l3E = this.loop3D.toString() != this.empty.toString();

        this.once2D();
        this.once3D();

        this.#loopRenderer();

        console.info('\n%cSHADE%cv' + this.version + '%cid: ' + this.canvas.id + '%c\n\n' +
            (this.config.debug ?
                ' CONFIGURATION\n\n' +
                ' └ config.width        : ' + this.config.width + '\n' +
                ' └ config.height       : ' + this.config.height + '\n' +
                ' └ config.alpha        : ' + this.config.alpha + ', ' + this.config.alpha2D + ', ' + this.config.alpha3D + '\n' +
                ' └ config.antialias    : ' + this.config.antialias + ', ' + this.config.antialias2D + ', ' + this.config.antialias3D + '\n' +
                ' └ config.api3D        : ' + this.config.api3D+'\n' +
                ' └ config.is_shadertoy : ' + this.config.is_shadertoy + '\n\n' +
                ' CANVAS\n\n'+
                ' └ canvas.width        : ' + this.canvas.width+'px\n' +
                ' └ canvas.height       : ' + this.canvas.height+'px\n' +
            '\n' : ''),
            'background-color: #ff8811; color: #222222; border-radius: 4px 0px 0px 4px; font-weight: 900; padding: 4px 8px 4px 8px;',
            'background-color: #333333; color: #dddddd; padding: 4px 8px 4px 8px;',
            'background-color: #888888; color: #000000; border-radius: 0px 4px 4px 0px; padding: 4px 8px 4px 8px;',
            ''
        );
    }
}
