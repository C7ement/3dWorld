/**
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / https://github.com/Mugen87
 *
 * @author C7ement / https://github.com/c7ement
 */

THREE.PointerLockControls = function (domElement) {

    this.domElement = domElement || document.body;
    this.isLocked = false;

    //
    // internals
    //

    var scope = this;

    var movementX = 0;
    var movementY = 0;

    var changeEvent = { type: 'change' };
    var lockEvent = { type: 'lock' };
    var unlockEvent = { type: 'unlock' };

    var euler = new THREE.Euler( 0, 0, 0, 'YXZ' );

    var PI_2 = Math.PI / 2;

    function onMouseMove( event ) {

        if ( scope.isLocked === false ) return;

        movementX += event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        movementY += event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        scope.dispatchEvent( changeEvent );

    }

    function onPointerlockChange() {

        if ( document.pointerLockElement === scope.domElement ) {

            scope.dispatchEvent( lockEvent );

            scope.isLocked = true;

        } else {

            scope.dispatchEvent( unlockEvent );

            scope.isLocked = false;

        }

    }

    function onPointerlockError() {

        console.error( 'THREE.PointerLockControls: Unable to use Pointer Lock API' );

    }

    this.connect = function () {

        document.addEventListener( 'mousemove', onMouseMove, false );
        document.addEventListener( 'pointerlockchange', onPointerlockChange, false );
        document.addEventListener( 'pointerlockerror', onPointerlockError, false );

    };

    this.disconnect = function () {

        document.removeEventListener( 'mousemove', onMouseMove, false );
        document.removeEventListener( 'pointerlockchange', onPointerlockChange, false );
        document.removeEventListener( 'pointerlockerror', onPointerlockError, false );

    };

    this.dispose = function () {

        this.disconnect();

    };

    this.getMovement = function () {
        data = {movementX: movementX, movementY: movementY};
        movementX = 0;
        movementY = 0;
        return data;
    };

    this.lock = function () {

        this.domElement.requestPointerLock();

    };

    this.unlock = function () {

        document.exitPointerLock();

    };

    this.connect();

};

THREE.PointerLockControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.PointerLockControls.prototype.constructor = THREE.PointerLockControls;