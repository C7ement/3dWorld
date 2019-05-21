
let ClickMarker = function() {

    let CANNON = require('cannon');

    this.position = new CANNON.Vec3();
    this.visible = false;

    this.data = {
        title: "clickMarker",
        position: this.position,
    };


    this.set = function(position) {
        this.visible = true;
        this.position.copy(position);
    };

    this.remove = function() {
        this.visible = false;
    };
};


module.exports = ClickMarker;