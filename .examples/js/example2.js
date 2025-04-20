import Shadertoy from '../../src/presets/ShaderToy.js';
import SHADE from '../../src/SHADE.js';

let example = new SHADE('EXAMPLE2', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, debug: true});

//

example.fragment_shader = await example.loadShader('glsl/example1.glsl');

//

example.run();
