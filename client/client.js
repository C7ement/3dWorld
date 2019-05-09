var scene, camera, renderer, controls, pitchObject, yawObject;
var socket;
var meshFloor;
var meshCannon;

var playersCube = new Map();



//to fix
window.addEventListener('resize', ()=> {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}, false);

window.addEventListener('keydown',(e)=>{
    socket.emit('keyDown',e.keyCode);
    if (e.keyCode==78) {
        addObjectToScene();
    }
    e.preventDefault();
}, false);
window.addEventListener('keyup',(e)=>{
    socket.emit('keyUp',e.keyCode);
}, false);

function loadObject(x,y,z) {
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.load('texture/nature_pack/Models/naturePack_107.mtl', (materials)=>{
        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('texture/nature_pack/Models/naturePack_107.obj', (mesh)=>{
            mesh.traverse((node)=>{
                node.castShadow = true;
                node.receiveShadow = true;
            });
            scene.add(mesh);
            mesh.position.set(x,y,z);
        });
    });
}
/*
function addObjectToScene() {
    var dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    var pos = camera.position;
    if (dir.y <= 0) {
        var coef = -pos.y / dir.y;
        loadObject(pos.x + coef * dir.x, 0, pos.x + coef * dir.x);
    }
}*/
function init() {
    initScene();

    socket = io.connect();
    //Display all the players present before the client
    socket.on('initPlayers', (players)=>{
        (new Map(players)).forEach((p,id)=>{
            var sphereGeometry = new THREE.BoxGeometry( 1,1,1 );
            var material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
            var mesh = new THREE.Mesh( sphereGeometry, material );
            scene.add( mesh );
            mesh.position.copy(p.body.position);
            mesh.quaternion.copy(p.body.quaternion);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            playersCube.set(id,mesh);
            //scene.add(mesh);
            renderer.render(scene, camera);
        });
    });
    //Display a new player
    socket.on('newPlayer', (data)=>{
        var sphereGeometry = new THREE.SphereGeometry( 0.7, 10, 10 );
        var material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
        var mesh = new THREE.Mesh( sphereGeometry, material );
        scene.add( mesh );
        mesh.position.set(data.p.body.position);
        mesh.quaternion.copy(p.body.quaternion);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        playersCube.set(data.id,mesh);
        //scene.add(mesh);
        renderer.render(scene, camera);
    });
//Update the position of every player
    socket.on('players', (players)=>{
        (new Map(players)).forEach((p,id)=>{
            playersCube.get(id).position.copy(p.body.position);
            playersCube.get(id).quaternion.copy(p.body.quaternion);
        });
        renderer.render(scene,camera);
    });

    socket.on('body', (data)=>{
        meshCannon.position.copy(data.position);
        meshCannon.quaternion.copy(data.quaternion);

        renderer.render(scene,camera);
    });
    socket.on('self', (self)=>{/*
        yawObject.position.copy(self.yawObject.position);
        pitchObject.position.copy(self.pitchObject.position);
        yawObject.rotation.copy(self.yawObject.rotation);
        pitchObject.rotation.copy(self.pitchObject.rotation);*/
        camera.position.copy(self.body.position);
        camera.quaternion.copy(self.body.quaternion);
        //camera.rotation.copy(self.body.rotation);
        //camera.quaternion.set(0,0,1);
        //console.log(camera.position);
        //camera.position.set(10,2,0);
        //camera.lookAt(0,0,0);
        renderer.render(scene,camera);
    });
    socket.on('playerLeaving', (id)=>{
        scene.remove(playersCube.get(id));
        renderer.render(scene,camera);
    });
}


function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    /*pitchObject = new THREE.Object3D();
    pitchObject.add(camera);
    yawObject = new THREE.Object3D();
    yawObject.position.y = 2;
    yawObject.add(pitchObject);*/
    //camera.position.set(10, 2, 0);
    //camera.lookAt(0, 2, 0);
    scene.add(camera);
    //CONTROLS
    //controls = new THREE.PointerLockControls( camera );
    /*
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
    scene.add( controls.getObject() );*/

    //SKYBOX

    scene.background = new THREE.CubeTextureLoader()
        .setPath('skybox/ashcanyon')
        .load([
            '_bk.tga',
            '_ft.tga',
            '_up.tga',
            '_dn.tga',
            '_rt.tga',
            '_lf.tga'
        ]);

    //SKYBOX


    meshFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10, 10, 10),
        new THREE.MeshPhongMaterial({color: 0xffffff, wireframe: false})
    );
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
        socket.emit('mouseMouve', controls.getMovement());
    }, 1 / 120);

}

//--------------------------------------------- POINTER LOCK ---------------------------------------------//



/*
window.addEventListener('mousemove', (e)=>{
    if ( controls.enabled === false ) return;
    var movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    var movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
    controls.dispatchEvent( changeEvent );
}, false);*/

function initPointerLock() {

    controls = new THREE.PointerLockControls(socket);


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