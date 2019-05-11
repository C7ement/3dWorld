var scene, camera, renderer, controls, pitchObject, yawObject;
var socket;
var meshFloor;
var meshCannon;

var playersMap = new Map();
var clickMap = new Map();

//////
var cubeMesh = false;
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
    });/*
    socket.on('clickMarkers', (clickeMarkers)=>{
        (new Map(clickeMarkers)).forEach((c,id)=>{
            if(clickMap.has(id)) {
                clickMap.get(id).position.copy(c.position);
            } else {
                var shape = new THREE.SphereGeometry(0.2, 8, 8);
                var mesh = new THREE.Mesh(shape, new THREE.MeshLambertMaterial( { color: 0xff0000 } ));
                scene.add(mesh);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                mesh.position.copy(c.position);
                clickMap.set(id,mesh);
                renderer.render(scene, camera);
            }
        });
        renderer.render(scene,camera);
    });
*/
    socket.on('body', (data)=>{
        meshCannon.position.copy(data.position);
        meshCannon.quaternion.copy(data.quaternion);

        renderer.render(scene,camera);
    });
    socket.on('playerLeaving', (id)=>{
        scene.remove(playersMap.get(id));
        renderer.render(scene,camera);
    });
    /////
    socket.on('mesh',(mesh)=>{
        if(cubeMesh) {
            cubeMesh.position.copy(mesh.position);
            cubeMesh.quaternion.copy(mesh.quaternion);
            renderer.render(scene, camera);
        } else {
            var cubeGeo = new THREE.BoxGeometry( 1, 1, 1, 10, 10 );
            var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: true } );
            cubeMesh = new THREE.Mesh(cubeGeo, cubeMaterial);
            scene.add(cubeMesh);
            cubeMesh.castShadow = true;
        }
    });
    socket.on('marker',(mesh)=>{
        if(marker) {
            marker.position.copy(mesh.position);
            //marker.visible = mesh.visible;
            renderer.render(scene, camera);
        } else {
            var shape = new THREE.SphereGeometry(0.2, 8, 8);
            marker = new THREE.Mesh(shape, markerMaterial);
            scene.add(marker);
            cubeMesh.castShadow = true;
        }
    });
}


function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    //SKYBOX
    /*
        scene.background = new THREE.CubeTextureLoader()
            .setPath('skybox/ashcanyon/ashcanyon')
            .load(['bk.png', 'ft.png', 'up.png', 'dn.png', 'rt.png', 'lf.png']);
        scene.background = new THREE.CubeTextureLoader()
            .setPath('skybox/ame_nebula/purplenebula_')
            .load(['bk.png', 'ft.png', 'up.png', 'dn.png', 'rt.png', 'lf.png']);
    */


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
    //camera.position.set(0, 1.8, -5);
    //camera.lookAt(new THREE.Vector3(0, 1.1, 0));

    //bodyTEST
    var geometry = new THREE.BoxGeometry(2, 2, 2);
    var material = new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true});
    meshCannon = new THREE.Mesh(geometry, material);
    scene.add(meshCannon);

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