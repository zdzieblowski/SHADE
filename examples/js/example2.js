import SHADE from "../../src/SHADE.js";

let example = new SHADE('EXAMPLE2', {width: 'maxWidth', height: 'maxHeight', is_shadertoy: true});

//

example.fragment_shader = await example.loadShader('glsl/example1.glslf');

//

example.run();
