import SHADE from "../../src/SHADE.js";

let example = new SHADE('EXAMPLE2', {width: 'maxWidth', height: 'maxHeight', is_shadertoy: true, debug: true});

//

example.fragment_shader = await example.loadShader('glsl/example1.glsl');

//

example.run();
