import SHADE from '../../src/SHADE.js';
import Shadertoy from '../../src/presets/Shadertoy.js';

let example = new SHADE('EXAMPLE3', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, debug: true});

//

example.fragment_shader = await example.loadShader('glsl/example3.glsl');

//

example.run();
