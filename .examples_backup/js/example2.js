import Shadertoy from '../../src/presets/Shadertoy.js';
import SHADE from '../../src/SHADE.js';
import h2D from '../../src/helpers/h2D.js';

let example = new SHADE('EXAMPLE2', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, helpers2D: h2D, debug: true, alpha: true, alpha3D: true});

//

example.fragment_shader = await example.loadShader('glsl/example1.glsl');

example.once2D = function() {

for(let x=0;x<1000;x++){
    this.helpers2D.drawPixel(x/10,100+Math.sin(x)*100,'rgb(255,0,0)');}

}

//

example.run();
