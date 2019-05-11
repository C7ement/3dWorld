
let ClickMarker = function() {

    let THREE = require('three');

    this.position = new THREE.Vector3();
    this.visible = false;

    this.data = {
        title: "clickMarker",
        position: this.position,
    };


    this.set = function(x,y,z) {
        this.visible = true;
        this.position.set(x,y,z);
    };

    this.remove = function() {
        this.visible = false;
    };
};


module.exports = ClickMarker;