var scene, camera, renderer, controls, pitchObject, yawObject;
var socket;
var meshFloor;
var meshCannon;

var playersMap = new Map();

//////
var cubeMesh = new Map();
var marker = false;


var markerMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
window.addEventListener('resize', ()=> {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}, false);

window.addEventListener('keydown',(e)=>{
    socket.emit('keyDown',e.keyCode);
    e.preventDefault();
}, false);
window.addEventListener('keyup',(e)=>{
    socket.emit('keyUp',e.keyCode);
}, false);
window.addEventListener('mousedown',(e)=>{
    socket.emit('onMouseDown',e);
}, false);
window.addEventListener('mouseup',(e)=>{
    socket.emit('onMouseUp',e);
}, false);


function init() {
    initScene();

    socket = io.connect();

    //Update the position of all the players
    socket.on('players', (players)=>{
        (new Map(players)).forEach((p,id)=>{
            if(playersMap.has(id)) {
                playersMap.get(id).position.copy(p.body.position);
                playersMap.get(id).quaternion.copy(p.body.quaternion);
                if (id == socket.id) {
                    camera.position.copy(p.camera.position);
                    camera.rotation.copy(p.camera.rotation);
                }
            } else {
                let sphereGeometry = new THREE.SphereGeometry( 0.7, 10, 10 );
                let material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
                let mesh = new THREE.Mesh( sphereGeometry, material );
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                scene.add( mesh );
                mesh.position.copy(p.body.position);
                mesh.quaternion.copy(p.body.quaternion);
                playersMap.set(id,mesh);
                renderer.render(scene, camera);
            }
        });
        renderer.render(scene,camera);
    });
    socket.on('playerLeaving', (id)=>{
        scene.remove(playersMap.get(id));
        renderer.render(scene,camera);
    });
    /////
    socket.on('mesh',(mesh)=>{
        if(cubeMesh.has(mesh.id)) {
            cubeMesh.get(mesh.id).position.copy(mesh.position);
            cubeMesh.get(mesh.id).quaternion.copy(mesh.quaternion);
            renderer.render(scene, camera);
        } else {
            var cubeGeo = new THREE.BoxGeometry( 1, 1, 1, 10, 10 );
            var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: false } );
            var newMesh =  new THREE.Mesh(cubeGeo, cubeMaterial);
            cubeMesh.set(mesh.id,newMesh);
            scene.add(newMesh);
            newMesh.castShadow = true;
        }
    });
    socket.on('marker',(mesh)=>{
        if(marker) {
            marker.position.copy(mesh.position);
            marker.visible = mesh.visible;
            renderer.render(scene, camera);
        } else {
            var shape = new THREE.SphereGeometry(0.2, 8, 8);
            marker = new THREE.Mesh(shape, markerMaterial);
            scene.add(marker);
            cubeMesh.castShadow = true;
        }
    });
    var cannonRay = false;
    var rayshape = new THREE.SphereGeometry(0.1, 8, 8);
    var fromMaterial = new THREE.MeshLambertMaterial( { color: 0xff00ff } );
    var toMaterial = new THREE.MeshLambertMaterial( { color: 0x00ffff } );
    socket.on('cannonRay',(inputRay)=>{
        if (!cannonRay) {
            cannonRay = {
                from: new THREE.Mesh(rayshape,fromMaterial),
                to: new THREE.Mesh(rayshape,toMaterial)
            };
            scene.add(cannonRay.from);
            scene.add(cannonRay.to);
        }
        cannonRay.from.position.copy(inputRay.from);
        cannonRay.to.position.copy(inputRay.to);
    });
    var threeRay = false;
    socket.on('threeRay',(inputRay)=>{
        if (!threeRay) {
            threeRay = {
                from: new THREE.Mesh(rayshape,fromMaterial),
                to: new THREE.Mesh(rayshape,toMaterial)
            };
            scene.add(threeRay.from);
            scene.add(threeRay.to);
        }
        threeRay.from.position.copy(inputRay.origin);
        var to = new THREE.Vector3();
        to.copy(inputRay.direction);
        to.multiplyScalar(2);
        to.add(inputRay.origin);
        threeRay.to.position.copy(to);
        console.log(to);
    });
}


function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    meshFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10, 10, 10),
        new THREE.MeshPhongMaterial({color: 0xffffff, wireframe: false})
    );
    meshFloor.receiveShadow = true;
    meshFloor.rotation.x -= Math.PI / 2;
    meshFloor.receiveShadow = true;
    scene.add(meshFloor);

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    var light = new THREE.PointLight(0xffffff, 0.8, 18);
    light.position.set(-3, 6, -3);
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 25;
    scene.add(light);

    var textureLoader = new THREE.TextureLoader();
    var crateTexture = new textureLoader.load('texture/3crates/crate0/crate0_diffuse.png');
    var crateBumpMap = new textureLoader.load('texture/3crates/crate0/crate0_bump.png');
    var crateNormalMap = new textureLoader.load('texture/3crates/crate0/crate0_normal.png');
    var crate = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: crateTexture,
            bumpMap: crateBumpMap,
            normalMap: crateNormalMap
        })
    );
    crate.position.set(-2, 1.5, -5);
    crate.receiveShadow = true;
    crate.castShadow = true;
    scene.add(crate);

//////////////////////


    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    document.body.appendChild(renderer.domElement);
    renderer.render(scene, camera);

    setInterval(() => {
        socket.emit('mouseMove', controls.getMovement());
    }, 1000 / 60);

}

//--------------------------------------------- POINTER LOCK ---------------------------------------------//


function initPointerLock() {

    controls = new THREE.PointerLockControls();

    var blocker = document.getElementById( 'blocker' );
    var instructions = document.getElementById( 'instructions' );
    instructions.addEventListener( 'click', function () {
        controls.lock();
    }, false );
    controls.addEventListener( 'lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    } );
    controls.addEventListener( 'unlock', function () {
        blocker.style.display = 'block';
        instructions.style.display = '';
    } );

}

//--------------------------------------------- ON LOAD ---------------------------------------------//

window.onload = function(){
    initPointerLock();
    init();
};