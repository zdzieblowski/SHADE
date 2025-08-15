import Shadertoy from '../../src/presets/ShaderToy.js';
import SHADE from '../../src/SHADE.js';

let example = new SHADE('EXAMPLE3', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, is_shadertoy: true});

//

example.fragment_shader = await example.loadShader('glsl/example3.glsl');

//

example.run();
