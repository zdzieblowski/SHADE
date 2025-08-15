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

    preset: null,
    helpers2D: null,
    helpers3D: null,

    debug: false
};

export default class SHADE {
    version = '0.5.0';

    mouse = [0, 0, 0, 0];
    mouseDown = false;

    time = performance.now();
    frame = 0;
    prev_date = new Date();

    l2E = false;
    l3E = false;

    animation;
    ready = false;
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
            this.mouse[0] = event.clientX - this.bcr.left;
            this.mouse[1] = event.clientY - this.bcr.top;
        }

        this.canvas.onmousedown = event => {
            this.updateBCR();
            this.mouseDown = true;
            this.mouse[0] = event.clientX - this.bcr.left;
            this.mouse[1] = event.clientY - this.bcr.top;
        }

        //

        this.canvas.ontouchmove = event => {
            event.preventDefault();
            this.mouse[0] = Math.min(Math.max(event.changedTouches[0].clientX - this.bcr.left, 0), this.bcr.width);
            this.mouse[1] = Math.min(Math.max(event.changedTouches[0].clientY - this.bcr.top, 0), this.bcr.height);
        }

        this.canvas.ontouchstart = event => {
            this.updateBCR();
            this.mouseDown = true;
            this.mouse[0] = event.changedTouches[0].clientX - this.bcr.left;
            this.mouse[1] = event.changedTouches[0].clientY - this.bcr.top;
        }

        //

        this.canvas.onmouseup = this.canvas.ontouchend = event => {
            this.mouseDown = false;
        }

        //

        const resizeEvent = new ResizeObserver(() => {
            this.#resizeCanvas();
        });

        resizeEvent.observe(this.canvas.parentElement);

        //

        this.empty = function () { }
        this.once2D = function () { }
        this.loop2D = function () { }
        this.once3D = function () { }
        this.loop3D = function () { }

        if (this.config.preset) {
            this.preset = new this.config.preset(this);
        }

        if (this.config.helpers2D) {
            this.helpers2D = new this.config.helpers2D(this);
        }

        if (this.config.helpers3D) {
            this.helpers3D = new this.config.helpers3D(this);
        }
    }

    //

    #applyPreset() {
        if (this.preset) {
            this.fragment_shader = this.fragment_shader == '' ? this.preset.fragment_shader : this.fragment_shader;
            this.vertex_shader = this.vertex_shader == '' ? this.preset.vertex_shader : this.vertex_shader;

            this.once2D = this.once2D.toString() == this.empty.toString() ? this.preset.once2D : this.once2D;
            this.loop2D = this.loop2D.toString() == this.empty.toString() ? this.preset.loop2D : this.loop2D;

            this.once3D = this.once3D.toString() == this.empty.toString() ? this.preset.once3D : this.once3D;
            this.loop3D = this.loop3D.toString() == this.empty.toString() ? this.preset.loop3D : this.loop3D;
        }

        this.l2E = this.loop2D.toString() != this.empty.toString();
        this.l3E = this.loop3D.toString() != this.empty.toString();
    }

    #parseSize(input) {
        return parseInt(input) ? parseInt(input) : {
            'maxWidth': this.canvas.parentElement.clientWidth,
            'maxHeight': this.canvas.parentElement.clientHeight
        }[input];
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

        if (!this.l2E && !this.l3E) {
            cancelAnimationFrame(this.animation);
        }

        this.animation = requestAnimationFrame(this.#loopRenderer.bind(this));
    }

    #resizeCanvas() {
        this.canvas2D.width = this.canvas3D.width = this.canvas.width = this.#parseSize(this.config.width);
        this.canvas2D.height = this.canvas3D.height = this.canvas.height = this.#parseSize(this.config.height);

        this.updateBCR();

        this.context3D.viewport(0, 0, this.canvas.width, this.canvas.height);

        if (this.preset) {
            this.preset.onResize();
        }

        if (!this.l2E || !this.l3E) {
            if (!this.l2E) {
                this.#_once2D();
            }

            if (!this.l3E) {
                this.#_once3D();
            }
        }
        if (!this.l2E && !this.l3E) {
            this.#loopRenderer();
        }
    }

    #_once2D() {
        this.once2D();
        // console.log('l2: ' + (this.l2E == false && this.l3E == false));
        if (this.l2E == false && this.l3E == false) {
            setTimeout(() => { cancelAnimationFrame(this.animation) }, 100);
        }

    }

    #_once3D() {
        this.once3D();
        // console.log('l3: ' + (this.l2E == false && this.l3E == false));
        if (this.l2E == false && this.l3E == false) {
            setTimeout(() => { cancelAnimationFrame(this.animation) }, 100);
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

    updateBCR() {
        this.bcr = this.canvas.getBoundingClientRect();
    }

    //

    async loadShader(shader_filename) {
        let shader_data = await fetch(shader_filename);
        return shader_data.text();
    }

    //

    run() {
        this.#applyPreset();

        this.#_once2D();
        this.#_once3D();

        this.#loopRenderer();
        this.ready = true;

        //

        this.style__debug_padding = 'padding: 4px 8px;';
        this.style__debug_section_colors = 'background-color: #999999; color: #111111;';
        this.style__debug_section = this.style__debug_section_colors + 'border-radius: 4px;' + this.style__debug_padding;

        console.info('\n%cSHADE%c≡%cv ' + this.version + '%cid: ' + this.canvas.id + '%c\n\n' +
            (this.config.debug ?
                ' %cCONFIGURATION%c\n\n' +
                ' └ config.width        : ' + this.config.width + '\n' +
                ' └ config.height       : ' + this.config.height + '\n' +
                ' └ config.alpha        : ' + this.config.alpha + ', ' + this.config.alpha2D + ', ' + this.config.alpha3D + '\n' +
                ' └ config.antialias    : ' + this.config.antialias + ', ' + this.config.antialias2D + ', ' + this.config.antialias3D + '\n' +
                ' └ config.api3D        : ' + this.config.api3D + '\n' +
                ' └ config.preset       : ' + (this.preset ? this.config.preset.name : '-') + '\n' +
                ' └ config.helpers2D    : ' + (this.helpers2D ? this.config.helpers2D.name : '-') + '\n' +
                ' └ config.helpers3D    : ' + (this.helpers3D ? this.config.helpers3D.name : '-') + '\n\n' +
                ' └ config.loops        : ' + this.l2E + ', ' + this.l3E + '\n\n' +
                ' %cCANVAS%c\n\n' +
                ' └ canvas.width        : ' + this.canvas.width + 'px\n' +
                ' └ canvas.height       : ' + this.canvas.height + 'px\n' +
                '\n' : '%c%c%c%c'),
            'background-color: #dddddd; color: #333333; border-radius: 4px 0px 0px 4px; font-weight: 900;' + this.style__debug_padding,
            'background-color: hsla(' + (Math.random() * 360) + ', ' + (25 + (Math.random() * 25)) + '%, ' + (25 + (Math.random() * 25)) + '%, 1); color: #dddddd;' + this.style__debug_padding,
            'background-color: #333333; color: #dddddd;' + this.style__debug_padding,
            this.style__debug_section_colors + 'border-radius: 0px 4px 4px 0px;' + this.style__debug_padding,
            '', this.style__debug_section, '', this.style__debug_section, ''
        );
    }
}
