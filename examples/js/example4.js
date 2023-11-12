import SHADE from "../../src/SHADE.js";

let example = new SHADE('EXAMPLE4', {width: 'maxWidth', height: 'maxHeight', is_shadertoy: true});

//

example.fragment_shader = await example.loadShader('glsl/example4.glsl');

//

example.run();
