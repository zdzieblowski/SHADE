export default class Shadertoy {
    constructor(SHADE) {
        //
        // FUNCTIONS
        //
        this.fragment_shader = ``;
        // 
        this.vertex_shader = `#version 300 es
        in vec4 _vertices;
        void main() { gl_Position = _vertices; }`;
        // 
        this.once2D = function () { }
        // 
        this.once3D = function () {
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
        //
        this.loop2D = function () { }
        //
        this.loop3D = function () {
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
        // CUSTOM RESIZE
        //
        this.onResize = function() {
            SHADE.mouse[0] = 0;
            SHADE.mouse[1] = 0;
        }
        //
        // INPUT EVENTS
        // 
        SHADE.canvas.onmousemove = event => {
            if (SHADE.mouseDown) {
                SHADE.updateBCR();
                SHADE.mouse[0] = event.clientX - SHADE.bcr.left;
                SHADE.mouse[1] = SHADE.bcr.bottom - event.clientY;
            }
        }
        //
        SHADE.canvas.onmousedown = event => {
            SHADE.updateBCR();
            SHADE.mouseDown = true;
            SHADE.mouse[0] = SHADE.mouse[2] = event.clientX - SHADE.bcr.left;
            SHADE.mouse[1] = SHADE.mouse[3] = SHADE.bcr.bottom - event.clientY;
        }
        //
        SHADE.canvas.ontouchmove = event => {
            event.preventDefault();
            if (SHADE.mouseDown) {
                SHADE.updateBCR();
                SHADE.mouse[0] = Math.min(Math.max(event.changedTouches[0].clientX - SHADE.bcr.left, 0), SHADE.bcr.width);
                SHADE.mouse[1] = Math.min(Math.max(SHADE.bcr.bottom - event.changedTouches[0].clientY, 0), SHADE.bcr.height);
            }
        }
        //
        SHADE.canvas.ontouchstart = event => {
            SHADE.updateBCR();
            SHADE.mouseDown = true;

            SHADE.mouse[0] = SHADE.mouse[2] = event.changedTouches[0].clientX - SHADE.bcr.left;
            SHADE.mouse[1] = SHADE.mouse[3] = SHADE.bcr.bottom - event.changedTouches[0].clientY;
        }
        //
        SHADE.canvas.ontouchend = SHADE.canvas.onmouseup = event => {
            SHADE.mouseDown = false;
            SHADE.mouse[2] = 0;
            SHADE.mouse[3] = 0;
        }
    }
}