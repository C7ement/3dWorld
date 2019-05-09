var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');

var CANNON = require('cannon');
var THREE = require('three');

var players = new Map();
var datas = new Map();
var sockets = new Map();
var contactNormals = new Map();

var htmlPath = path.join(__dirname, 'client');
app.use(express.static(htmlPath));

var world, mass, shape, timeStep=1/60,
    camera, scene, renderer, geometry, material, mesh;

var canJump = true;
var canWalkJump = true;
var jumpVelocity = 5;
var walkJumpVelocity = 0.5;
var velocityFactor = 2;
var PI_2 = Math.PI / 2;
var upAxis = new CANNON.Vec3(0,1,0);

var gravity = -1.81;

io.on('connection', function(socket){
    var contactNormal = new CANNON.Vec3();


    var currentPlayer = {
        body: new CANNON.Body({mass: 5}),
        contactNormal: contactNormal,
        camera: new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 ),
        pitchObject: new THREE.Object3D(),
        yawObject: new THREE.Object3D(),
        moveForward: false,
        moveLeft: false,
        moveBackward: false,
        moveRight: false,
        mouseX: 0,
        mouseY: 0,
    };
    var data = {
        camera: {
            position: currentPlayer.camera.position,
            rotation: currentPlayer.camera.rotation,
            quaternion: currentPlayer.camera.quaternion,
            cam : currentPlayer.camera
        },
        body: {
            position: currentPlayer.body.position,
            rotation: currentPlayer.body.rotation,
            quaternion: currentPlayer.body.quaternion
        }
    };
    currentPlayer.pitchObject.add(currentPlayer.camera);
    currentPlayer.yawObject.position.y = 2;
    currentPlayer.yawObject.add( currentPlayer.pitchObject );

    currentPlayer.camera.position.set(10, 2, 0);
    currentPlayer.camera.lookAt(0, 2, 0);
    var shape = new CANNON.Box(new CANNON.Vec3(1,1,1));

    currentPlayer.body.addShape(shape);
    currentPlayer.body.linearDamping = 0.9;
    currentPlayer.body.angularDamping = 0.9;
    currentPlayer.body.position.set(0,10,0);
    currentPlayer.body.addEventListener("collide",function(e){
        var contact = e.contact;
        // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
        // We do not yet know which one is which! Let's check.
        if(contact.bi.id == currentPlayer.body.id) { // bi is the player body, flip the contact normal
            contact.ni.negate(contactNormals.get(currentPlayer.body.id));
        } else {
            contactNormals.get(currentPlayer.body.id).copy(contact.ni); // bi is something else. Keep the normal as it is
        }
        // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
        if(contactNormals.get(currentPlayer.body.id).dot(upAxis) > 0.5) {// Use a "good" threshold value between 0 and 1 here!
            canJump = true;
            canWalkJump = true;
        }
    });
    world.addBody(currentPlayer.body);

    sockets.set(socket.id,socket);
    players.set(socket.id,currentPlayer);
    datas.set(socket.id,data);
    contactNormals.set(currentPlayer.body.id,new CANNON.Vec3());
    socket.emit('initPlayers',Array.from(datas));
    socket.broadcast.emit('newPlayer',{p: data,id: socket.id});
    socket.on('disconnect', () => {
        players.delete(socket.id);
        sockets.delete(socket.id);
        socket.broadcast.emit('playerLeaving',socket.id);
    });
    socket.on('keyUp',(keyCode)=> {
        var p = players.get(socket.id);
        switch (keyCode) {
            case 38: // up
            case 90: // z
                p.moveForward = false;
                break;
            case 37: // left
            case 81: // q
                p.moveLeft = false;
                break;
            case 40: // down
            case 83: // s
                p.moveBackward = false;
                break;
            case 39: // right
            case 68: // d
                p.moveRight = false;
                break;
        }
    });
    socket.on('keyDown',(keyCode)=>{
        var p = players.get(socket.id);
        switch (keyCode) {
            case 38: // up
            case 90: // z
                p.moveForward = true;
                break;
            case 37: // left
            case 81: // q
                p.moveLeft = true;
                break;
            case 40: // down
            case 83: // s
                p.moveBackward = true;
                break;
            case 39: // right
            case 68: // d
                p.moveRight = true;
                break;
            case 32: // space
                if ( canJump === true ){
                    p.body.velocity.y = jumpVelocity;
                }
                canJump = false;
                break;
        }
    });
    socket.on('mouseMouve',(data)=>{
        var p = players.get(socket.id);
        p.body.angularVelocity.x -= data.movementY/500;
        p.body.angularVelocity.y -= data.movementX/500;
        if ( canWalkJump && (data.movementX !== 0 || data.movementY !== 0) ){
            p.body.velocity.y = walkJumpVelocity;
            canWalkJump = false;
        }
    });
});

var euler = new THREE.Euler( 0, 0, 0, 'YXZ' );

server.listen(3000, function(){
    console.log('listening on *:3000');
});
var bodyTest;

function initCannon() {
    world = new CANNON.World();
    world.gravity.set(0,gravity,0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.add(groundBody);

    shape = new CANNON.Box(new CANNON.Vec3(1,1,1));
    mass = 1;
    bodyTest = new CANNON.Body({
        mass: 1
    });
    bodyTest.addShape(shape);

    bodyTest.angularVelocity.set(0,1,0);
    bodyTest.linearDamping = 0.5;
    bodyTest.position.set(0,10,0);
    world.addBody(bodyTest);

}

function update() {
    var delta =1000/60* 0.1;
    world.step(timeStep);

    players.forEach((p,id)=>{
        //if ( scope.enabled === false ) return;
        var inputVelocity = new THREE.Vector3(0,0,0);
        var euler = new THREE.Euler();
        var quat = new THREE.Quaternion();

        if ( canWalkJump && (p.moveForward || p.moveBackward || p.moveLeft || p.moveRight) ){
            p.body.velocity.y = walkJumpVelocity;
            canWalkJump = false;
        }
        if ( p.moveForward ){
            p.body.velocity.z = -velocityFactor * delta;
        }
        if ( p.moveBackward ){
            p.body.velocity.z = velocityFactor * delta;
        }
        if ( p.moveLeft ){
            p.body.velocity.x = -velocityFactor * delta;
        }
        if ( p.moveRight ){
            p.body.velocity.x = velocityFactor * delta;
        }

        // Convert velocity to world coordinates
        /*
        euler.x = p.pitchObject.rotation.x;
        euler.y = p.yawObject.rotation.y;
        euler.order = "XYZ";
        quat.setFromEuler(euler);
        inputVelocity.applyQuaternion(quat);*/
        //quat.multiplyVector3(inputVelocity);

        // Add to the object
        /*
        p.body.velocity.x += inputVelocity.x;
        p.body.velocity.z += inputVelocity.z;
        p.yawObject.position.copy(p.body.position);
    */
        sockets.get(id).emit('self',datas.get(id));
    });
    io.sockets.emit('players',Array.from(datas));
    io.sockets.emit('body',{position: bodyTest.position, quaternion: bodyTest.quaternion});
}


initCannon();
setInterval(update, 1000 / 60);