import SHADE from "../../src/SHADE.js";

let example = new SHADE('EXAMPLE1', {width: 'maxWidth', height: 'maxHeight', is_shadertoy: true}, import.meta);
example.fragment_shader = await example.loadShader('glsl/example2.glsl');
example.run();
