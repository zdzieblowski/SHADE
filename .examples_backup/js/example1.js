import Shadertoy from '../../src/presets/Shadertoy.js';
import SHADE from '../../src/SHADE.js';

let example = new SHADE('EXAMPLE1', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, debug: true});

//

example.fragment_shader = await example.loadShader('glsl/example2.glsl');

let xxx = 0;

example.loop2D = function() {
    if(xxx+1<255) {
    xxx = xxx + 1;
    }
    else {
        xxx=0;
    }
    this.context2D.fillStyle = 'rgba('+xxx+',0,0,.25)';
    this.context2D.fillRect(0, 0, example.mouse[0], this.canvas.height-example.mouse[1]);
    this.context2D.fillStyle = 'rgba(0,'+(255-xxx)+',0,.25)';
    this.context2D.fillRect(example.mouse[0], this.canvas.height-example.mouse[1], this.canvas.width, this.canvas.height);
}

//

example.run();
