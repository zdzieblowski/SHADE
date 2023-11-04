import SHADE from "../../src/SHADE.js";

let example = new SHADE('EXAMPLE', {width: 'maxWidth', height: 'maxHeight', is_shadertoy: true});

//

example.fragment_shader = await example.loadShader('glsl/example.glsl');

example.once2D = function() {
    this.context2D.fillStyle = 'rgba(0,0,0,.25)';
    this.context2D.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
}

//
example.run();
