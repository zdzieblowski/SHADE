import SHADE from '../../src/SHADE.js';
import Shadertoy from '../../src/presets/ShaderToy.js';

let example = new SHADE('EXAMPLE4', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, debug: false});

//

example.fragment_shader = await example.loadShader('glsl/example4.glsl');

//

example.run();
