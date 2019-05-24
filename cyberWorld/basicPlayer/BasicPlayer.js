

let BasicPlayer = function(world, meshDatas, bodies) {

    let CANNON = require('cannon');
    let THREE = require('three');

    this.body = new CANNON.Body({mass: 5});
    this.camera = new THREE.Object3D();
    //this.camera = new CANNON.Body({mass: 0});
    this.velocityFactor = 0.05;
    this.jumpVelocity = 5;
    this.timeOut = 1000/60;

    //Data that will be sent to the client for the display.
    this.data = {
        camera: {
            position: this.camera.position,
            rotation: this.camera.rotation,
        },
        body: {
            position: this.body.position,
            quaternion: this.body.quaternion
        },
    };

    let contactNormal = new CANNON.Vec3();
    let upAxis = new CANNON.Vec3(0,1,0);
    let euler = new THREE.Euler( 0, 0, 0, 'YXZ' );
    let moveForward = false;
    let moveLeft = false;
    let moveBackward = false;
    let moveRight = false;
    let canJump = false;

    this.camera.position.set(10, 2, 0);
    this.camera.lookAt(0, 2, 0);
    let shape = new CANNON.Sphere(0.7);

    this.body.addShape(shape);
    this.body.linearDamping = 0.9;
    this.body.angularDamping = 0.9;
    this.body.position.set(0,10,0);

    this.body.addEventListener("collide",function(e){
        // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
        if(e.contact.bi.id === this.id) { // bi is the player body, flip the contact normal
            e.contact.ni.negate(contactNormal);
        } else {
            contactNormal.copy(e.contact.ni); // bi is something else. Keep the normal as it is
        }
        // If contactNormal.dot(upAxis) is between 0 and 1 the contact normal is in the up direction.
        if(contactNormal.dot(upAxis) > 0.5) {
            canJump = true;
        }
    });

    this.getCannonRay = function(){
        let pos = new THREE.Vector3();
        let dir = new THREE.Vector3();
        this.camera.getWorldPosition(pos);
        this.camera.getWorldDirection(dir);
        dir.negate();
        var from = new CANNON.Vec3(pos.x,pos.y,pos.z);
        var to =  new CANNON.Vec3(dir.x,dir.y,dir.z);
        to = to.scale(10);
        to = to.vadd(from);
        var ray = new CANNON.Ray(from,to);
        return ray;
    };

    this.keyUp = function(keyCode){
        switch (keyCode) {
            case 38: // up
            case 90: // z
                moveForward = false;
                break;
            case 37: // left
            case 81: // q
                moveLeft = false;
                break;
            case 40: // down
            case 83: // s
                moveBackward = false;
                break;
            case 39: // right
            case 68: // d
                moveRight = false;
                break;
        }
    };
    this.keyDown = function(keyCode){
        switch (keyCode) {
            case 38: // up
            case 90: // z
                moveForward = true;
                break;
            case 37: // left
            case 81: // q
                moveLeft = true;
                break;
            case 40: // down
            case 83: // s
                moveBackward = true;
                break;
            case 39: // right
            case 68: // d
                moveRight = true;
                break;
            case 32: // space
                if ( canJump === true ){
                    this.body.velocity.y = this.jumpVelocity;
                }
                canJump = false;
                break;
            case 65: //a (insert)
                insertElement();
        }
    };
    this.mouseMove = function(data){
        euler.setFromQuaternion( this.camera.quaternion );
        euler.y -= data.movementX * 0.002;
        euler.x -= data.movementY * 0.002;
        euler.x = Math.max( -Math.PI/2, Math.min(Math.PI/2, euler.x));
        this.camera.quaternion.setFromEuler(euler);
    };

    setInterval(()=>{

        let inputVelocity = new THREE.Vector3();
        let v = this.velocityFactor * this.timeOut;

        if (moveForward) { inputVelocity.z = -v; }
        if (moveBackward) { inputVelocity.z = v; }
        if (moveLeft) { inputVelocity.x = -v; }
        if (moveRight) { inputVelocity.x = v; }

        inputVelocity.applyQuaternion(this.camera.quaternion);

        this.body.velocity.x += inputVelocity.x;
        this.body.velocity.z += inputVelocity.z;
        this.camera.position.copy(this.body.position);
        this.camera.position.y += 1;

    },this.timeOut);

    let insertElement = function() {

        var ballShape = new CANNON.Sphere(0.2);
        var ballBody = new CANNON.Body({ mass: 1 });
        ballBody.addShape(ballShape);
        ballBody.position.set(0,2,0);
        world.addBody(ballBody);
        bodies.push(ballBody);

        meshDatas.set(ballBody.id,{position: ballBody.position, quaternion: ballBody.quaternion})

    }
};

module.exports = BasicPlayer;