import SHADE from '../../src/SHADE.js';
import Shadertoy from '../../src/presets/Shadertoy.js';

let example = new SHADE('EXAMPLE2', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, debug: false});

//

example.fragment_shader = await example.loadShader('glsl/example2.glsl');

//

example.run();
