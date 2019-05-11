var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');

var CANNON = require('cannon');
var THREE = require('three');

var CyberWorld = require('./cyberWorld/CyberWorld');

var htmlPath = path.join(__dirname, 'client');
app.use(express.static(htmlPath));

var players = new Map();
var datas = new Map();
var clickMarkers = new Map();

var clickMarker = new CyberWorld.ClickMarker;
var world, mass;

var gravity = -5.81;
var deltaUpdate = 1000/60;
var  timeStep=1/60;

/////////
var scene = new THREE.Scene();
var meshes=[], bodies=[];
var bodyTest;
var mouseConstraint =false;
var jointBody, constrainedBody;
var constraintDown = false;

io.on('connection', function(socket) {
    ///////////
    var gplane=false;
    var geometry, material, mesh;
    var controls,time = Date.now();
    ///////////

    let player = new CyberWorld.BasicPlayer();
    world.addBody(player.body);

    players.set(socket.id, player);
    datas.set(socket.id, player.data);

    socket.on('disconnect', () => {
        players.delete(socket.id);
        datas.delete(socket.id);
        socket.broadcast.emit('playerLeaving', socket.id);
    });
    socket.on('keyUp', (keyCode) => {
        player.keyUp(keyCode);
    });
    socket.on('keyDown', (keyCode) => {
        player.keyDown(keyCode);
    });
    socket.on('mouseMove', (data) => {
        player.mouseMove(data);
        if (gplane && mouseConstraint) {
            var pos = projectOntoPlane(gplane);
            if (pos) {
                clickMarker.set(pos.x,pos.y,pos.z);
                socket.emit('marker',clickMarker.data);
                moveJointToPoint(pos.x, pos.y, pos.z);
            }
        }
    });
    socket.on('onMouseDown', (e) => {
        // Find mesh from a ray
        var entity = objectInFront(player);
        var pos = entity.point;
        if (pos && entity.object.geometry instanceof THREE.BoxGeometry) {
            constraintDown = true;
            // Set marker on contact point

            clickMarker.set(pos.x,pos.y,pos.z);
            clickMarkers.set(clickMarker,socket.id);
            socket.emit('marker',clickMarker.data);
            // Set the movement plane
            setScreenPerpCenter(pos);

            //comment code is maybe to prevent clicking on hiden objects

            //var idx = meshes.indexOf(entity.object);
            //if (idx !== -1) {
            addMouseConstraint(pos.x, pos.y, pos.z, bodies[0]);
            //}
        }
    });
    socket.on('onMouseUp', (e) => {
        constraintDown = false;
        clickMarkers.delete(socket.id);
        clickMarker.remove();
        removeJointConstraint();
    });

    let setScreenPerpCenter = function (point) {
        // If it does not exist, create a new one
        if (!gplane) {
            var planeGeo = new THREE.PlaneGeometry(100, 100);
            var plane = gplane = new THREE.Mesh(planeGeo, material);
            plane.visible = true; // Hide it..
            scene.add(gplane);
        }
        // Center at mouse position
        gplane.position.copy(point);
        // Make it face toward the camera
        gplane.quaternion.copy(player.camera.quaternion);
    };
    let projectOntoPlane = function(plane) {
        let hits = player.getCameraRay().intersectObjects([plane]);
        if (hits.length > 0) {
            return hits[0].point;
        } else {
            return false;
        }
    };
    let moveJointToPoint = function(x,y,z) {
        jointBody.position.set(x,y,z);
        mouseConstraint.update();
    };
    let removeJointConstraint = function(){
        world.removeConstraint(mouseConstraint);
        mouseConstraint = false;
    };
    socket.emit('marker',{position: new THREE.Vector3()});
});

server.listen(3000, function(){
    console.log('listening on *:3000');
});

function initCannon() {


    world = new CANNON.World();
    world.gravity.set(0,gravity,0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.add(groundBody);

    ////
    var shape = new CANNON.Box(new CANNON.Vec3(1,1,1));
    bodyTest = new CANNON.Body({
        mass: 1
    });
    bodyTest.addShape(shape);

    bodyTest.angularVelocity.set(0,1,0);
    bodyTest.linearDamping = 0.5;
    bodyTest.position.set(0,10,0);
    world.addBody(bodyTest);

    //CREAT BOXES
    var mass = 5, radius = 1.3;
    var boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));

    ////
    var boxBody = new CANNON.Body({ mass: 1 });
    boxBody.addShape(boxShape);
    boxBody.position.set(0,5,0);
    world.addBody(boxBody);
    bodies.push(boxBody);

    // cubes
    var cubeGeo = new THREE.BoxGeometry( 1, 1, 1, 10, 10 );
    var cubeMaterial = new THREE.MeshPhongMaterial( { color: 0x888888 } );
    cubeMesh = new THREE.Mesh(cubeGeo, cubeMaterial);
    cubeMesh.castShadow = true;
    meshes.push(cubeMesh);
    scene.add(cubeMesh);


    // Joint body
    var shape = new CANNON.Sphere(0.1);
    jointBody = new CANNON.Body({ mass: 0 });
    jointBody.addShape(shape);
    jointBody.collisionFilterGroup = 0;
    jointBody.collisionFilterMask = 0;
    world.addBody(jointBody);


}

function update() {
    world.step(timeStep);
    ///////// THREE
    for (i in meshes) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }
    /////////
    io.sockets.emit('players',Array.from(datas));
    io.sockets.emit('body',{position: bodyTest.position, quaternion: bodyTest.quaternion});
    io.sockets.emit('mesh',{position: bodies[0].position,quaternion: bodies[0].quaternion});
    io.sockets.emit('marker',clickMarker.data);
}

initCannon();
setInterval(update, deltaUpdate);



//Mouse pick

function addMouseConstraint(x,y,z,body) {
    // The cannon body constrained by the mouse joint
    constrainedBody = body;
    // Vector to the clicked point, relative to the body
    var v1 = new CANNON.Vec3(x,y,z).vsub(constrainedBody.position);
    // Apply anti-quaternion to vector to tranform it into the local body coordinate system
    var antiRot = constrainedBody.quaternion.inverse();
    pivot = antiRot.vmult(v1); // pivot is not in local body coordinates
    // Move the cannon click marker particle to the click position
    jointBody.position.set(x,y,z);
    // Create a new constraint
    // The pivot for the jointBody is zero
    mouseConstraint = new CANNON.PointToPointConstraint(constrainedBody, pivot, jointBody, new CANNON.Vec3(0,0,0));
    // Add the constriant to world
    world.addConstraint(mouseConstraint);
}

function objectInFront(player) {
    let ray = player.getCameraRay();
    let hits = ray.intersectObjects(meshes);
    let closest = false;
    if (hits.length > 0) {
        closest = hits[0];
    }
    return closest;
}