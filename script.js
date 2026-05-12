const container = document.getElementById('gameContainer');
const regenerateButton = document.getElementById('newCarButton');
const resetButton = document.getElementById('resetButton');
const messageLabel = document.getElementById('message');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 120);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x777788, 0.7);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(-30, 60, 25);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
scene.add(ambientLight, sunLight);

const blockSize = 2;
const worldRadius = 10;
const worldLimit = worldRadius * blockSize - 1;
const blockGeometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x4c8f2f }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x8f5c32 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x6e6e6e }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x2d7a17 }),
};

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const worldGrid = {};
const blockMeshes = [];

const player = {
  position: new THREE.Vector3(0, 12, 8),
  velocity: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  pitch: 0,
  speed: 12,
  jumpSpeed: 10,
  height: 1.8,
  grounded: false,
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const input = { forward: false, back: false, left: false, right: false, jump: false };
let pointerLockActive = false;

function resetWorld() {
  blockMeshes.forEach((block) => worldGroup.remove(block));
  blockMeshes.length = 0;
  Object.keys(worldGrid).forEach((key) => delete worldGrid[key]);
  createTerrain();
  createTrees();
  resetPlayer();
  updateHUD('World regenerated. Click again to lock the mouse.');
}

function createTerrain() {
  for (let x = -worldRadius; x <= worldRadius; x += 1) {
    for (let z = -worldRadius; z <= worldRadius; z += 1) {
      const height = Math.max(
        1,
        Math.floor(
          1 +
            Math.sin(x * 0.35) * 2 +
            Math.cos(z * 0.4) * 1.8 +
            Math.random() * 1.6
        )
      );

      for (let y = 0; y < height; y += 1) {
        const type = y === height - 1 ? 'grass' : y < height - 2 ? 'dirt' : 'stone';
        addBlock(x, y, z, type);
      }
    }
  }
}

function createTrees() {
  for (let i = 0; i < 14; i += 1) {
    const gx = Math.floor(Math.random() * (worldRadius * 2 + 1)) - worldRadius;
    const gz = Math.floor(Math.random() * (worldRadius * 2 + 1)) - worldRadius;
    const topY = getHighestBlockY(gx, gz);
    if (topY < 0) {
      continue;
    }

    const topBlock = getBlockAt(gx, topY, gz);
    if (!topBlock || topBlock.userData.type !== 'grass') {
      continue;
    }

    addTree(gx, topY + 1, gz);
  }
}

function addTree(gx, gy, gz) {
  const trunkHeight = 3;
  for (let i = 0; i < trunkHeight; i += 1) {
    addBlock(gx, gy + i, gz, 'wood');
  }

  const leafHeight = gy + trunkHeight;
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dz = -2; dz <= 2; dz += 1) {
      for (let dy = 0; dy <= 2; dy += 1) {
        const distance = Math.abs(dx) + Math.abs(dz) + dy;
        if (distance <= 4 && !getBlockAt(gx + dx, leafHeight + dy, gz + dz)) {
          addBlock(gx + dx, leafHeight + dy, gz + dz, 'leaves');
        }
      }
    }
  }
}

function gridKey(gx, gy, gz) {
  return `${gx},${gy},${gz}`;
}

function getBlockAt(gx, gy, gz) {
  return worldGrid[gridKey(gx, gy, gz)] || null;
}

function getHighestBlockY(gx, gz) {
  for (let y = 18; y >= 0; y -= 1) {
    if (getBlockAt(gx, y, gz)) {
      return y;
    }
  }
  return -1;
}

function addBlock(gx, gy, gz, type) {
  if (gy < 0 || gx < -worldRadius || gx > worldRadius || gz < -worldRadius || gz > worldRadius) {
    return null;
  }

  const key = gridKey(gx, gy, gz);
  if (worldGrid[key]) {
    return null;
  }

  const block = new THREE.Mesh(blockGeometry, materials[type] || materials.dirt);
  block.position.set(gx * blockSize, gy * blockSize + blockSize / 2, gz * blockSize);
  block.castShadow = false;
  block.receiveShadow = true;
  block.userData = { gx, gy, gz, type };

  worldGroup.add(block);
  blockMeshes.push(block);
  worldGrid[key] = block;
  return block;
}

function removeBlock(block) {
  if (!block || !block.userData) {
    return;
  }

  const { gx, gy, gz } = block.userData;
  if (gy < 0) {
    return;
  }

  const key = gridKey(gx, gy, gz);
  delete worldGrid[key];
  const index = blockMeshes.indexOf(block);
  if (index >= 0) {
    blockMeshes.splice(index, 1);
  }
  worldGroup.remove(block);
}

function resetPlayer() {
  const startX = 0;
  const startZ = 8;
  const surfaceY = getSurfaceY(startX, startZ);
  player.position.set(startX, surfaceY + player.height / 2 + 0.5, startZ);
  player.velocity.set(0, 0, 0);
  player.grounded = false;
  player.yaw = 0;
  player.pitch = 0;
  updateCamera();
}

function getSurfaceY(worldX, worldZ) {
  const gx = Math.round(worldX / blockSize);
  const gz = Math.round(worldZ / blockSize);
  const highest = getHighestBlockY(gx, gz);
  return highest >= 0 ? (highest + 1) * blockSize : 0;
}

function updateHUD(text) {
  messageLabel.textContent = text;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleKeys(event, value) {
  switch (event.code) {
    case 'KeyW':
      input.forward = value;
      break;
    case 'KeyS':
      input.back = value;
      break;
    case 'KeyA':
      input.left = value;
      break;
    case 'KeyD':
      input.right = value;
      break;
    case 'Space':
      input.jump = value;
      break;
    case 'KeyR':
      if (value) {
        resetWorld();
      }
      break;
  }
}

function onMouseMove(event) {
  if (!pointerLockActive) {
    return;
  }
  player.yaw -= event.movementX * 0.0025;
  player.pitch -= event.movementY * 0.0025;
  player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
}

function onMouseDown(event) {
  if (!pointerLockActive) {
    return;
  }

  event.preventDefault();
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(blockMeshes, false);
  if (!hits.length) {
    return;
  }

  const hit = hits[0];
  const block = hit.object;
  const normal = hit.face.normal;
  const { gx, gy, gz } = block.userData;

  if (event.button === 0) {
    removeBlock(block);
    updateHUD('Block broken. Right-click to place a block.');
  } else if (event.button === 2) {
    const targetX = gx + Math.round(normal.x);
    const targetY = gy + Math.round(normal.y);
    const targetZ = gz + Math.round(normal.z);
    addBlock(targetX, targetY, targetZ, 'dirt');
    updateHUD('Block placed.');
  }
}

function onPointerLockChange() {
  pointerLockActive = document.pointerLockElement === renderer.domElement;
  if (pointerLockActive) {
    updateHUD('WASD to move, space to jump, left-click to break, right-click to place. R regenerates.');
  } else {
    updateHUD('Click to lock the mouse and start playing.');
  }
}

function updateCamera() {
  const eyeHeight = player.position.y + 0.1;
  camera.position.set(player.position.x, eyeHeight, player.position.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function updatePlayer(dt) {
  const direction = new THREE.Vector3();
  if (input.forward) direction.z -= 1;
  if (input.back) direction.z += 1;
  if (input.left) direction.x -= 1;
  if (input.right) direction.x += 1;

  if (direction.lengthSq() > 0) {
    direction.normalize();
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
    direction.multiplyScalar(player.speed * dt);
    player.position.add(direction);
  }

  player.position.x = Math.max(-worldLimit, Math.min(worldLimit, player.position.x));
  player.position.z = Math.max(-worldLimit, Math.min(worldLimit, player.position.z));

  if (input.jump && player.grounded) {
    player.velocity.y = player.jumpSpeed;
    player.grounded = false;
  }

  player.velocity.y -= 24 * dt;
  player.position.y += player.velocity.y * dt;

  const floorY = getSurfaceY(player.position.x, player.position.z);
  const minY = floorY + player.height / 2;

  if (player.position.y <= minY) {
    player.position.y = minY;
    player.velocity.y = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }

  updateCamera();
}

function animate(now) {
  const dt = Math.min((now - (animate.lastTime || now)) / 1000, 0.033);
  animate.lastTime = now;

  updatePlayer(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', onWindowResize);
window.addEventListener('keydown', (event) => handleKeys(event, true));
window.addEventListener('keyup', (event) => handleKeys(event, false));
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('contextmenu', (event) => event.preventDefault());

document.addEventListener('pointerlockchange', onPointerLockChange);

renderer.domElement.addEventListener('click', () => {
  if (!pointerLockActive) {
    renderer.domElement.requestPointerLock();
  }
});

regenerateButton.addEventListener('click', resetWorld);
resetButton.addEventListener('click', resetPlayer);

resetWorld();
