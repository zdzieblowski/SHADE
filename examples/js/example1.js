import SHADE from '../../src/SHADE.js';
import Shadertoy from '../../src/presets/Shadertoy.js';
import h2D from '../../src/helpers/h2D.js';

// let example = new SHADE('EXAMPLE1', {width: 'maxWidth', height: 'maxHeight', preset: Shadertoy, helpers2D: h2D, debug: true});
let example = new SHADE('EXAMPLE1', {width: 'maxWidth', height: 'maxHeight', helpers2D: h2D, debug: true, alpha: true, alpha3D: true});

//

// example.fragment_shader = await example.loadShader('../glsl/example2.glsl');
// example.fragment_shader=``;
// let xxx = 0;
let yyy = 100;

example.once2D = function() {
    // console.log(this.l2E+'/'+this.l3E);
    // if(xxx+1<255) {
    // xxx = xxx + 1;
    // }
    // else {
    //     xxx=0;
    // }

    // this.context2D.fillStyle = 'rgba('+xxx+',0,0,1)';
    // this.context2D.fillRect(0, 0, example.mouse[0], this.canvas.height-example.mouse[1]);
    // this.context2D.fillStyle = 'rgba(0,'+(255-xxx)+',0,1)';
    // this.context2D.fillRect(example.mouse[0], this.canvas.height-example.mouse[1], this.canvas.width, this.canvas.height);
for(let x=0;x<100000;x++){
    this.helpers2D.drawPixel(x/90,yyy+Math.sin(x)*500,'rgba(255,0,0,0.5)');}

}

//

example.run();
