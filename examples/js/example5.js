import SHADE from "../../src/SHADE.js";

let example = new SHADE('EXAMPLE5', {width: 'maxWidth', height: 'maxHeight', is_shadertoy: true});

//

example.fragment_shader = await example.loadShader('glsl/example5.glsl');

//

example.run();
