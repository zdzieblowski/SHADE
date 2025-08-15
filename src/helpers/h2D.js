export default class h2D {
    constructor(SHADE) {
        this.drawPixel = function (x,y,c) {
            SHADE.context2D.fillStyle = c;
            SHADE.context2D.fillRect(x, y, 1, 1);
        };
    }
}