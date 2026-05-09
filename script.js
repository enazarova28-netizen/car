const container = document.getElementById('gameContainer');
const lapCountLabel = document.getElementById('lapCount');
const speedMeter = document.getElementById('speedMeter');
const messageLabel = document.getElementById('message');
const newCarButton = document.getElementById('newCarButton');
const resetButton = document.getElementById('resetButton');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1220, 0.007);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const lights = [];
lights.push(new THREE.HemisphereLight(0xddeeff, 0x081820, 0.65));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(25, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
lights.push(dirLight);
lights.forEach(light => scene.add(light));

const roadRadius = 22;
const maxLaps = 3;
const track = createTrack();
const player = createRacer(0x4ab3ff);
const bots = [createRacer(0xff5252), createRacer(0xf5a623), createRacer(0x8cff88)];

scene.add(player.group);
bots.forEach(bot => scene.add(bot.group));

function createTrack() {
  const trackGroup = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.RingGeometry(roadRadius - 4, roadRadius + 4, 144),
    new THREE.MeshStandardMaterial({ color: 0x222b42, roughness: 0.8, metalness: 0.1 })
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  trackGroup.add(road);

  const outerGuard = new THREE.Mesh(
    new THREE.TorusGeometry(roadRadius + 4.3, 0.4, 16, 128),
    new THREE.MeshStandardMaterial({ color: 0x111a28, roughness: 0.9, metalness: 0.15 })
  );
  outerGuard.rotation.x = Math.PI / 2;
  outerGuard.receiveShadow = true;
  trackGroup.add(outerGuard);

  const innerGuard = new THREE.Mesh(
    new THREE.TorusGeometry(roadRadius - 4.3, 0.4, 16, 128),
    new THREE.MeshStandardMaterial({ color: 0x111a28, roughness: 0.9, metalness: 0.15 })
  );
  innerGuard.rotation.x = Math.PI / 2;
  innerGuard.receiveShadow = true;
  trackGroup.add(innerGuard);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.77 });
  const linePoints = [];
  for (let i = 0; i < 120; i += 2) {
    const angle = (i / 120) * Math.PI * 2;
    const start = new THREE.Vector3((roadRadius - 0.4) * Math.cos(angle), 0.05, (roadRadius - 0.4) * Math.sin(angle));
    const end = new THREE.Vector3((roadRadius + 0.4) * Math.cos(angle), 0.05, (roadRadius + 0.4) * Math.sin(angle));
    linePoints.push(start, end);
  }
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const dashedLine = new THREE.LineSegments(lineGeometry, lineMaterial);
  trackGroup.add(dashedLine);

  const finishLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 })
  );
  finishLine.position.set(roadRadius, 0.1, 0);
  finishLine.rotation.y = Math.PI / 2;
  trackGroup.add(finishLine);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  trackGroup.add(ground);

  scene.add(trackGroup);
  return { finishAngle: 0 };
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
    angle: 0,
    lap: 0,
    lastAngle: 0,
    color,
  };
}

function resetRace() {
  player.angle = 0;
  player.speed = 0;
  player.lap = 0;
  player.lastAngle = 0;
  player.group.position.set(roadRadius, 0, 0);
  player.group.rotation.y = -Math.PI / 2;

  bots.forEach((bot, index) => {
    bot.angle = -Math.PI * 0.35 * (index + 1);
    bot.speed = 18 + index * 2;
    bot.lap = 0;
    bot.lastAngle = bot.angle;
    updateRacerPosition(bot);
  });

  updateHUD('Drive with ↑ ↓ ← →. Finish 3 laps to win.');
  lapCountLabel.textContent = `Lap 0 / ${maxLaps}`;
}

function updateRacerPosition(racer) {
  const radius = roadRadius;
  const x = radius * Math.cos(racer.angle);
  const z = radius * Math.sin(racer.angle);
  racer.group.position.set(x, 0, z);
  racer.group.rotation.y = -racer.angle + Math.PI / 2;
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

newCarButton.addEventListener('click', () => {
  const randomColor = Math.random() * 0xffffff;
  scene.remove(player.group);
  const newPlayer = createRacer(randomColor);
  newPlayer.angle = player.angle;
  newPlayer.speed = player.speed;
  newPlayer.lap = player.lap;
  newPlayer.lastAngle = player.lastAngle;
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
  const acceleration = 28;
  const braking = 48;
  const maxSpeed = 42;
  const turnSpeed = 2.2;

  if (input.ArrowUp) {
    player.speed = Math.min(player.speed + acceleration * dt, maxSpeed);
  } else if (input.ArrowDown) {
    player.speed = Math.max(player.speed - braking * dt, -12);
  } else {
    player.speed *= 0.994;
  }

  if (input.ArrowLeft) {
    player.angle += turnSpeed * dt * (player.speed / maxSpeed);
  }
  if (input.ArrowRight) {
    player.angle -= turnSpeed * dt * (player.speed / maxSpeed);
  }

  player.angle += (player.speed / 10) * dt;
  checkLapProgress(player);
  updateRacerPosition(player);
  speedMeter.textContent = `Speed ${Math.round(Math.abs(player.speed))}`;
}

function updateBots(dt) {
  bots.forEach((bot) => {
    const noise = (Math.sin(bot.angle * 2.3 + performance.now() * 0.001) + 1) * 0.5;
    const desiredSpeed = 16 + (bot.color === 0xff5252 ? 8 : bot.color === 0xf5a623 ? 7 : 6);
    bot.speed += (desiredSpeed + noise * 2 - bot.speed) * dt * 0.5;
    bot.angle += (bot.speed / 10) * dt;
    checkLapProgress(bot);
    updateRacerPosition(bot);
  });
}

function checkLapProgress(racer) {
  const normalized = normalizeAngle(racer.angle);
  const crossed = racer.lastAngle > Math.PI * 1.5 && normalized < Math.PI * 0.5;
  if (crossed) {
    racer.lap += 1;
    if (racer === player) {
      lapCountLabel.textContent = `Lap ${player.lap} / ${maxLaps}`;
      if (player.lap >= maxLaps) {
        updateHUD('You finished the race! Press Restart to play again.');
      } else {
        updateHUD('Lap completed! Keep racing.');
      }
    }
  }
  racer.lastAngle = normalized;
}

function normalizeAngle(angle) {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a;
}

function updateCamera() {
  const offset = new THREE.Vector3(0, 8, 16);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -player.angle + Math.PI);
  camera.position.copy(player.group.position).add(offset);
  camera.lookAt(player.group.position.x, player.group.position.y + 1.2, player.group.position.z);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);
requestAnimationFrame(animate);
