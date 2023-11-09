import SHADE from "../../src/SHADE.js";

let example = new SHADE('EXAMPLE3', {width: 'maxWidth', height: 'maxHeight', is_shadertoy: true});

//

example.fragment_shader = await example.loadShader('glsl/example3.glslf');

//

example.run();
