const container = document.getElementById('gameContainer');
const lapCountLabel = document.getElementById('lapCount');
const speedMeter = document.getElementById('speedMeter');
const messageLabel = document.getElementById('message');
const newCarButton = document.getElementById('newCarButton');
const resetButton = document.getElementById('resetButton');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1220, 0.007);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

let cameraDistance = 12;
const cameraMinDistance = 6;
const cameraMaxDistance = 26;
const cameraHeight = 6;

const lights = [];
lights.push(new THREE.HemisphereLight(0xddeeff, 0x081820, 0.65));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(25, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
lights.push(dirLight);
lights.forEach(light => scene.add(light));

const roadLength = 100;
const roadWidth = 12;
const startZ = -roadLength / 2 + 1;
const maxLaps = 3;
const track = createTrack();
const player = createRacer(0x4ab3ff);
const bots = [createRacer(0xff5252), createRacer(0xf5a623), createRacer(0x8cff88)];

scene.add(player.group);
bots.forEach(bot => scene.add(bot.group));

function createTrack() {
  const trackGroup = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(roadWidth, roadLength),
    new THREE.MeshStandardMaterial({ color: 0x222b42, roughness: 0.8, metalness: 0.1 })
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  trackGroup.add(road);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.8, roadLength),
    new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.7 })
  );
  leftWall.position.set(-(roadWidth / 2 + 0.25), 0.4, 0);
  leftWall.receiveShadow = true;
  trackGroup.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.8, roadLength),
    new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.7 })
  );
  rightWall.position.set(roadWidth / 2 + 0.25, 0.4, 0);
  rightWall.receiveShadow = true;
  trackGroup.add(rightWall);

  const finishLine = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth + 1, 0.1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
  );
  finishLine.position.set(0, 0.05, roadLength / 2 - 1);
  trackGroup.add(finishLine);

  const startLine = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth + 1, 0.1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
  );
  startLine.position.set(0, 0.05, -roadLength / 2 + 1);
  trackGroup.add(startLine);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 250),
    new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.position.z = 0;
  trackGroup.add(ground);

  scene.add(trackGroup);
  return { finishZ: roadLength / 2 - 1 };
}

function createRacer(color) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 4), bodyMaterial);
  body.castShadow = true;
  body.position.y = 0.7;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.6), new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.4, metalness: 0.05 }));
  cabin.position.set(0, 1.05, -0.35);
  group.add(cabin);

  const wheelGeometry = new THREE.CylinderGeometry(0.33, 0.33, 0.4, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0f16, metalness: 0.6, roughness: 0.4 });
  const wheelPositions = [
    [-0.9, 0.35, 1.2],
    [0.9, 0.35, 1.2],
    [-0.9, 0.35, -1.2],
    [0.9, 0.35, -1.2],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
  });

  return {
    group,
    speed: 0,
    posZ: 0,
    posX: 0,
    direction: 0,
    lap: 0,
    lastLapZ: -roadLength / 2,
    color,
  };
}

function resetRace() {
  player.posZ = -roadLength / 2 + 5;
  player.posX = 0;
  player.speed = 0;
  player.direction = 0;
  player.lap = 0;
  player.lastLapZ = -roadLength / 2;
  player.group.position.set(player.posX, 0, player.posZ);
  player.group.rotation.y = 0;

  bots.forEach((bot, index) => {
    bot.posZ = -roadLength / 2 + 5 + (index + 1) * 8;
    bot.posX = (index - 1) * 2.5;
    bot.speed = 15 + index * 2;
    bot.direction = 0;
    bot.lap = 0;
    bot.lastLapZ = -roadLength / 2;
    bot.group.position.set(bot.posX, 0, bot.posZ);
    bot.group.rotation.y = 0;
  });

  updateHUD('Drive with ↑ ↓ ← →. Reach the finish line 3 times to win.');
  lapCountLabel.textContent = `Lap 0 / ${maxLaps}`;
}

function updateRacerPosition(racer) {
  racer.group.position.set(racer.posX, 0, racer.posZ);
  racer.group.rotation.y = racer.direction;
  
  const clampedX = Math.max(-roadWidth / 2 + 1.2, Math.min(roadWidth / 2 - 1.2, racer.posX));
  racer.group.position.x = clampedX;
}

const input = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', (event) => {
  if (input.hasOwnProperty(event.key)) {
    input[event.key] = true;
    event.preventDefault();
  }
});
window.addEventListener('keyup', (event) => {
  if (input.hasOwnProperty(event.key)) {
    input[event.key] = false;
    event.preventDefault();
  }
});

window.addEventListener('wheel', (event) => {
  cameraDistance += event.deltaY * 0.03;
  cameraDistance = Math.max(cameraMinDistance, Math.min(cameraMaxDistance, cameraDistance));
});

newCarButton.addEventListener('click', () => {
  const randomColor = Math.random() * 0xffffff;
  scene.remove(player.group);
  const newPlayer = createRacer(randomColor);
  newPlayer.posZ = player.posZ;
  newPlayer.posX = player.posX;
  newPlayer.speed = player.speed;
  newPlayer.direction = player.direction;
  newPlayer.lap = player.lap;
  newPlayer.lastLapZ = player.lastLapZ;
  player.group = newPlayer.group;
  player.color = randomColor;
  scene.add(player.group);
  updateRacerPosition(player);
});

resetButton.addEventListener('click', resetRace);

function updateHUD(text) {
  messageLabel.textContent = text;
}

let lastTime = performance.now();
resetRace();

function animate(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  updatePlayer(dt);
  updateBots(dt);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updatePlayer(dt) {
  const acceleration = 35;
  const braking = 55;
  const maxSpeed = 50;
  const turnSpeed = 4.5;
  const lateralForce = 25;

  if (input.ArrowUp) {
    player.speed = Math.min(player.speed + acceleration * dt, maxSpeed);
  } else if (input.ArrowDown) {
    player.speed = Math.max(player.speed - braking * dt, -15);
  } else {
    player.speed *= 0.992;
  }

  if (input.ArrowLeft) {
    player.direction = Math.min(player.direction + turnSpeed * dt, 0.4);
    player.posX += lateralForce * dt;
  } else if (input.ArrowRight) {
    player.direction = Math.max(player.direction - turnSpeed * dt, -0.4);
    player.posX -= lateralForce * dt;
  } else {
    player.direction *= 0.94;
  }

  player.posZ += player.speed * dt;
  checkLapProgress(player);
  updateRacerPosition(player);
  speedMeter.textContent = `Speed ${Math.round(Math.abs(player.speed))}`;
}

function updateBots(dt) {
  bots.forEach((bot, idx) => {
    const noise = Math.sin(bot.posZ * 0.03 + performance.now() * 0.002) * 2;
    const desiredSpeed = 18 + idx * 2;
    bot.speed += (desiredSpeed - bot.speed) * dt * 0.6;
    
    bot.posZ += bot.speed * dt;
    bot.posX += noise * dt * 0.5;
    bot.direction = noise * 0.1;
    
    checkLapProgress(bot);
    updateRacerPosition(bot);
  });
}

function checkLapProgress(racer) {
  const finishZ = track.finishZ;
  if (racer.posZ >= finishZ && racer.lastLapZ < finishZ) {
    racer.lap += 1;
    racer.lastLapZ = racer.posZ;
    
    if (racer === player) {
      lapCountLabel.textContent = `Lap ${player.lap} / ${maxLaps}`;
      if (player.lap >= maxLaps) {
        updateHUD('🏁 You finished the race! Press Restart to play again.');
      } else {
        updateHUD('✓ Lap completed! Keep racing.');
      }
    }
  }

  if (racer.posZ > finishZ + 2) {
    racer.posZ = startZ + (racer.posZ - finishZ - 2);
    racer.lastLapZ = startZ;
  }
}

function updateCamera() {
  const offset = new THREE.Vector3(0, cameraHeight, -cameraDistance);
  camera.position.copy(player.group.position).add(offset);
  camera.lookAt(player.group.position.x, player.group.position.y + 1, player.group.position.z);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);
requestAnimationFrame(animate);
