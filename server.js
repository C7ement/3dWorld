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

var meshes=[], bodies=[];

var mouseConstraint =false;
var jointBody;
var constraintDown = false;


io.on('connection', function(socket) {


    let player = new CyberWorld.BasicPlayer(world, meshes, bodies);
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
        if (mouseConstraint) {
            let pos = new THREE.Vector3();
            let dir = new THREE.Vector3();
            player.camera.getWorldPosition(pos);
            player.camera.getWorldDirection(dir);
            dir.negate();
            var from = new CANNON.Vec3(pos.x,pos.y,pos.z);
            var to =  new CANNON.Vec3(dir.x,dir.y,dir.z);
            to = to.scale(distance);
            to = to.vadd(player.getCannonRay().from);
            if (to) {
                clickMarker.set(to);
                socket.emit('marker',clickMarker.data);
                moveJointToPoint(to);
            }
        }
    });
    var distance;
    socket.on('onMouseDown', (e) => {
        // Find mesh from a ray
        var result = bodyInFront(player,meshes);
        if (result) {
            var point = result.hitPointWorld;
            constraintDown = true;
            clickMarker.set(point);
            socket.emit('marker',clickMarker.data);
            distance = player.camera.position.distanceTo(new THREE.Vector3(point.x,point.y,point.z));
            addMouseConstraint(point, result.body);

        }
    });
    socket.on('onMouseUp', (e) => {
        constraintDown = false;
        clickMarkers.delete(socket.id);
        clickMarker.remove();
        removeJointConstraint();
    });

    let moveJointToPoint = function(point) {
        jointBody.position.copy(point);
        mouseConstraint.update();
    };
    let removeJointConstraint = function(){
        world.removeConstraint(mouseConstraint);
        mouseConstraint = false;
    };


    let addMouseConstraint = function(position,constrainedBody) {
        let v1 = position.vsub(constrainedBody.position);
        let antiRot = constrainedBody.quaternion.inverse();
        let pivot = antiRot.vmult(v1);
        jointBody.position.copy(position);
        mouseConstraint = new CANNON.PointToPointConstraint(constrainedBody, pivot, jointBody, new CANNON.Vec3(0,0,0));
        world.addConstraint(mouseConstraint);
    };

    let bodyInFront = function() {
        let ray = player.getCannonRay();
        let result = new CANNON.RaycastResult();
        ray.intersectBodies(bodies,result);
        if (result.body != null) {
            return result;
        } else {
            return false;
        }
    };


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

    //CREAT BOXES
    var mass = 5, radius = 1.3;
    var boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));

    ////
    var boxBody = new CANNON.Body({ mass: 1 });
    boxBody.addShape(boxShape);
    boxBody.position.set(1,3,3);
    boxBody.linearDamping = 0.5;
    world.addBody(boxBody);
    bodies.push(boxBody);
    boxBody = new CANNON.Body({ mass: 1 });
    boxBody.addShape(boxShape);
    boxBody.position.set(-3,3,3);
    boxBody.angularDamping = 1;
    world.addBody(boxBody);
    bodies.push(boxBody);


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
    for (var i in bodies) {
        io.sockets.emit('mesh', {id: bodies[i].id, position: bodies[i].position, quaternion: bodies[i].quaternion});
    }
    io.sockets.emit('players', Array.from(datas));
    io.sockets.emit('marker',clickMarker.data);
}

initCannon();
setInterval(update, deltaUpdate);


//Mouse pick
