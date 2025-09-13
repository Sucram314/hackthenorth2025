import { HandLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

    const ui = {
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      dot: document.getElementById('dot'),
      status: document.getElementById('status'),
      fps: document.getElementById('fps'),
      handsCount: document.getElementById('handsCount'),
      brushingValue: document.getElementById('brushingValue'),
      score: document.getElementById('score'),
      totalObstacles: document.getElementById('totalObstacles'), // New UI element
      timer: document.getElementById('timer'),
      log: document.getElementById('log'),
      video: document.getElementById('video'),
      overlay: document.getElementById('overlay'),
    };

    let stream;
    let detector;
    let rafId = 0;
    let lastTime = 0, frames = 0, lastFpsUpdate = 0;

    const mainCtx = ui.overlay.getContext('2d');
    const drawer = new DrawingUtils(mainCtx);

    let overlayWidth = 0;
    let overlayHeight = 0;

    let LANE_HEIGHT;
    const PLAYER_SIZE = 40;
    let objectY;
    let targetY;
    let objectX;
    let lastValidTargetY; // New variable to store the last valid targetY

    // Brushing detection variables
    const HISTORY_SIZE = 10;
    let handXPositions = [];
    let brushingValue = 0;
    const BRUSHING_DECAY = 0.9;
    const BRUSHING_IMPACT_FACTOR = 3; // How much brushing affects obstacle speed
    let smoothedBrushingImpact = 0; // New variable for smoothed impact
    const SMOOTHING_ALPHA = 0.1; // Smoothing factor (0 to 1, lower = more smooth)
    
    // Depth-based scaling variables
    const REFERENCE_DEPTH_Z = -0.1; // A typical Z-value for a hand at a "normal" distance (experiment with this)
    const DEPTH_SCALING_FACTOR = 1; // How strongly distance affects the scale (adjust as needed)

    // Game state variables
    let score = 0;
    let gameOver = false;
    let currentLaneState = "front"; // To keep track of the current hand posture state

    // Timer variables
    const GAME_DURATION_SECONDS = 120; // 2 minutes
    let timeLeft = GAME_DURATION_SECONDS;
    let timerInterval;

    // Level definition and state
    const NUMBER_OF_OBSTACLES = 10; // Fixed number of obstacles for the level
    const OBSTACLE_SPACING_DISTANCE = 500; // Distance between obstacles (in pixels)
    const COLLECTIBLE_SPACING_DISTANCE = 250; // Distance between collectibles (in pixels)
    const OBSTACLE_HEIGHT = 60; // Fixed height for obstacles
    const COLLECTIBLE_SIZE = 20; // Size of collectibles
    const NUMBER_OF_COLLECTIBLES = 20; // Number of collectibles per level
    let level = {
      obstacles: [],
      collectibles: [], // New array for collectibles
      baseObstacleSpeed: 2, // Base speed for obstacles
      lanes: [0, 1, 2] // Lane indices
    };

    function setStatus(text){ ui.status.textContent = text; }
    function setLive(on){
      ui.dot.style.background = on ? '#7f8' : '#f88';
      setStatus(on ? 'live' : 'idle');
    }

    async function initDetector(){
      setStatus('loading model…');
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      detector = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    }

    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = GAME_DURATION_SECONDS;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                gameOver = true;
                ui.log.textContent = "Time's up! Game Over.";
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        ui.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // New helper functions for creating obstacles and collectibles
    const obstacleTypes = [
        { type: 'car', multiplier: 2, color: '#e84c3d' }, // Red car
        { type: 'truck', multiplier: 3, color: '#f1c40f' }, // Yellow truck
        { type: 'train', multiplier: 4, color: '#3498db' }  // Blue train
    ];

    function createNewObstacle(initialXPosition) {
        const randomLane = level.lanes[Math.floor(Math.random() * level.lanes.length)];
        const randomObstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const obstacleWidth = OBSTACLE_HEIGHT * randomObstacleType.multiplier;

        return {
            lane: randomLane,
            x: initialXPosition + obstacleWidth, // Position relative to initialXPosition
            speed: level.baseObstacleSpeed,
            height: OBSTACLE_HEIGHT,
            width: obstacleWidth,
            color: randomObstacleType.color,
            type: randomObstacleType.type,
            passed: false
        };
    }

    function createNewCollectible(initialXPosition) {
        let collectibleX, collectibleY, collectibleLane;
        let collidedWithObstacle = true;
        let attempts = 0;

        // Try to place collectible without colliding with an existing obstacle
        while (collidedWithObstacle && attempts < 100) {
            collectibleLane = level.lanes[Math.floor(Math.random() * level.lanes.length)];
            collectibleX = initialXPosition + Math.random() * overlayWidth / 2; // Random X position within a range
            collectibleY = LANE_HEIGHT * collectibleLane + LANE_HEIGHT / 2;

            collidedWithObstacle = false;
            for (const obstacle of level.obstacles) {
                const obstacleTop = (LANE_HEIGHT * obstacle.lane + LANE_HEIGHT / 2) - obstacle.height / 2;
                const obstacleBottom = (LANE_HEIGHT * obstacle.lane + LANE_HEIGHT / 2) + obstacle.height / 2;
                const obstacleLeft = obstacle.x - obstacle.width / 2;
                const obstacleRight = obstacle.x + obstacle.width / 2;

                const collectibleTop = collectibleY - COLLECTIBLE_SIZE / 2;
                const collectibleBottom = collectibleY + COLLECTIBLE_SIZE / 2;
                const collectibleLeft = collectibleX - COLLECTIBLE_SIZE / 2;
                const collectibleRight = collectibleX + COLLECTIBLE_SIZE / 2;

                const xOverlap = Math.max(0, Math.min(collectibleRight, obstacleRight) - Math.max(collectibleLeft, obstacleLeft));
                const yOverlap = Math.max(0, Math.min(collectibleBottom, obstacleBottom) - Math.max(collectibleTop, obstacleTop));

                if (xOverlap > 0 && yOverlap > 0) {
                    collidedWithObstacle = true;
                    break;
                }
            }
            attempts++;
        }

        if (!collidedWithObstacle) {
            return {
                lane: collectibleLane,
                x: collectibleX,
                y: collectibleY,
                size: COLLECTIBLE_SIZE,
                color: '#FFD700'
            };
        }
        return null; // Return null if placement failed
    }

    async function startCamera(){
      if (!detector) await initDetector();
      ui.startBtn.disabled = true;
      ui.stopBtn.disabled = false;
      setLive(true);
      gameOver = false;
      score = 0;
      ui.score.textContent = score;
      startTimer(); // Start the timer

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false
      });
      ui.video.srcObject = stream;
      await ui.video.play();

      overlayWidth = ui.video.videoWidth;
      overlayHeight = ui.video.videoHeight;
      ui.overlay.width = overlayWidth;
      ui.overlay.height = overlayHeight;

      LANE_HEIGHT = overlayHeight / 3;
      objectY = LANE_HEIGHT * 1.5;
      targetY = objectY;
      objectX = overlayWidth / 4;
      lastValidTargetY = targetY; // Initialize lastValidTargetY

      handXPositions = [];
      brushingValue = 0;
      smoothedBrushingImpact = 0; // Initialize smoothed value
      currentLaneState = "front"; // Reset state on camera start

      // Initialize obstacles based on number and spacing
      level.obstacles = [];
      ui.totalObstacles.textContent = NUMBER_OF_OBSTACLES;
      

      for (let i = 0; i < NUMBER_OF_OBSTACLES; i++) {
        const initialX = overlayWidth + (i * OBSTACLE_SPACING_DISTANCE);
        level.obstacles.push(createNewObstacle(initialX));
      }

      // Initialize collectibles
      level.collectibles = [];
      for (let i = 0; i < NUMBER_OF_COLLECTIBLES; i++) {
          const initialX = overlayWidth + (i * COLLECTIBLE_SPACING_DISTANCE);
          const newCollectible = createNewCollectible(initialX);
          if (newCollectible) {
              level.collectibles.push(newCollectible);
          }
      }

      lastTime = -1; frames = 0; lastFpsUpdate = performance.now();
      loop();
    }

    function stopCamera(){
      cancelAnimationFrame(rafId);
      clearInterval(timerInterval); // Stop the timer when camera stops
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      mainCtx.clearRect(0,0,ui.overlay.width, ui.overlay.height);
      ui.video.srcObject = null;
      ui.startBtn.disabled = false;
      ui.stopBtn.disabled = true;
      setLive(false);
      ui.handsCount.textContent = "0";
      ui.fps.textContent = "0";
      ui.brushingValue.textContent = "0.00";
      gameOver = true;
      updateTimerDisplay(); // Ensure timer displays final state
    }

    function estimateHandRotation(landmarks) {
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];
      const pinkyMcp = landmarks[17];

      const vecUpX = middleMcp.x - wrist.x;
      const vecUpY = middleMcp.y - wrist.y;
      const vecUpZ = middleMcp.z - wrist.z;

      const magUp = Math.sqrt(vecUpX*vecUpX + vecUpY*vecUpY + vecUpZ*vecUpZ);
      const normUpY = vecUpY / magUp;

      const pitch = Math.asin(normUpY) * (180 / Math.PI);

      const vecSideX = pinkyMcp.x - wrist.x;
      const vecSideY = pinkyMcp.y - wrist.y;
      const roll = Math.atan2(vecSideY, vecSideX) * (180 / Math.PI);

      const yaw = Math.atan2(vecUpX, -vecUpZ) * (180 / Math.PI);

      return {
        yaw: parseFloat(yaw.toFixed(2)),
        pitch: parseFloat(pitch.toFixed(2)),
        roll: parseFloat(roll.toFixed(2)),
      };
    }

    function getLaneFromPitch(pitch) {
        // Define base thresholds
        const BASE_UP_THRESHOLD = -60;
        const BASE_DOWN_THRESHOLD = 30;

        // Define hysteresis bias
        const HYSTERESIS_BIAS = 10; // degrees

        let upThreshold = BASE_UP_THRESHOLD;
        let downThreshold = BASE_DOWN_THRESHOLD;

        // Apply bias based on current state
        if (currentLaneState === "up") {
            // To go from "up" to "front", pitch must be greater than BASE_UP_THRESHOLD + BIAS
            upThreshold = BASE_UP_THRESHOLD + HYSTERESIS_BIAS;
        } else if (currentLaneState === "down") {
            // To go from "down" to "front", pitch must be less than BASE_DOWN_THRESHOLD - BIAS
            downThreshold = BASE_DOWN_THRESHOLD - HYSTERESIS_BIAS;
        } else if (currentLaneState === "front") {
            // To go from "front" to "up", pitch must be less than BASE_UP_THRESHOLD - BIAS
            // To go from "front" to "down", pitch must be greater than BASE_DOWN_THRESHOLD + BIAS
            upThreshold = BASE_UP_THRESHOLD - HYSTERESIS_BIAS;
            downThreshold = BASE_DOWN_THRESHOLD + HYSTERESIS_BIAS;
        }

        let newState;
        if (pitch < upThreshold) {
            newState = "down"; // Hand tilted upwards, means 'down' in selfie view
        } else if (pitch > downThreshold) {
            newState = "up"; // Hand tilted downwards, means 'up' in selfie view
        } else {
            newState = "front";
        }

        currentLaneState = newState; // Update the global state
        return newState;
    }

    function checkCollision(playerX, playerY, playerSize, object) {
      // Player (circle): centerX, centerY, radius
      const playerRadius = playerSize / 2;
      const playerTop = playerY - playerRadius;
      const playerBottom = playerY + playerRadius;
      const playerLeft = playerX - playerRadius;
      const playerRight = playerX + playerRadius;

      // Obstacle/Collectible (rectangle or circle for simplicity)
      // For obstacles, we calculate based on its properties.
      // For collectibles, we'll use its x, y, and size properties directly.
      let objectTop, objectBottom, objectLeft, objectRight;

      if (object.type) { // It's an obstacle
          objectTop = (LANE_HEIGHT * object.lane + LANE_HEIGHT / 2) - object.height / 2;
          objectBottom = (LANE_HEIGHT * object.lane + LANE_HEIGHT / 2) + object.height / 2;
          objectLeft = object.x - object.width / 2;
          objectRight = object.x + object.width / 2;
      } else { // It's a collectible
          objectTop = object.y - object.size / 2;
          objectBottom = object.y + object.size / 2;
          objectLeft = object.x - object.size / 2;
          objectRight = object.x + object.size / 2;
      }

      // Check for overlap on X axis
      const xOverlap = Math.max(0, Math.min(playerRight, objectRight) - Math.max(playerLeft, objectLeft));
      // Check for overlap on Y axis
      const yOverlap = Math.max(0, Math.min(playerBottom, objectBottom) - Math.max(playerTop, objectTop));

      // If both overlaps are greater than 0, there is a collision
      return xOverlap > 0 && yOverlap > 0;
    }


    function drawGameOverlay() {
      mainCtx.save();
      mainCtx.scale(-1, 1);
      mainCtx.translate(-overlayWidth, 0);

      // Draw lanes
      mainCtx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
      mainCtx.lineWidth = 2;
      mainCtx.beginPath();
      mainCtx.moveTo(0, LANE_HEIGHT);
      mainCtx.lineTo(overlayWidth, LANE_HEIGHT);
      mainCtx.moveTo(0, LANE_HEIGHT * 2);
      mainCtx.lineTo(overlayWidth, LANE_HEIGHT * 2);
      mainCtx.stroke();

      // Move player object smoothly
      if (Math.abs(targetY - objectY) > 1) {
          objectY += (targetY - objectY) * 0.1;
      } else {
          objectY = targetY;
      }

      // Draw the player object
      mainCtx.fillStyle = '#5ad';
      mainCtx.beginPath();
      mainCtx.arc(objectX, objectY, PLAYER_SIZE / 2, 0, Math.PI * 2);
      mainCtx.fill();

      // Draw obstacles
      level.obstacles.forEach(obstacle => {
        const obstacleYCenter = LANE_HEIGHT * obstacle.lane + LANE_HEIGHT / 2;
        const obstacleX = obstacle.x - obstacle.width / 2; // Top-left X for drawing
        const obstacleY = obstacleYCenter - obstacle.height / 2; // Top-left Y for drawing

        mainCtx.fillStyle = obstacle.color;
        mainCtx.fillRect(obstacleX, obstacleY, obstacle.width, obstacle.height);

        // Draw additional shapes based on obstacle type
        if (obstacle.type === 'car') {
            mainCtx.fillStyle = 'rgba(0,0,0,0.5)'; // Darker color for car details
            // Windshield
            mainCtx.fillRect(obstacleX + obstacle.width * 0.2, obstacleY + obstacle.height * 0.1, obstacle.width * 0.6, obstacle.height * 0.3);
            // Rear window
            mainCtx.fillRect(obstacleX + obstacle.width * 0.2, obstacleY + obstacle.height * 0.6, obstacle.width * 0.6, obstacle.height * 0.3);
            // Wheels (simplified circles)
            mainCtx.fillStyle = '#333';
            mainCtx.beginPath();
            mainCtx.arc(obstacleX + obstacle.width * 0.15, obstacleY + obstacle.height * 0.25, obstacle.height * 0.15, 0, Math.PI * 2);
            mainCtx.arc(obstacleX + obstacle.width * 0.15, obstacleY + obstacle.height * 0.75, obstacle.height * 0.15, 0, Math.PI * 2);
            mainCtx.arc(obstacleX + obstacle.width * 0.85, obstacleY + obstacle.height * 0.25, obstacle.height * 0.15, 0, Math.PI * 2);
            mainCtx.arc(obstacleX + obstacle.width * 0.85, obstacleY + obstacle.height * 0.75, obstacle.height * 0.15, 0, Math.PI * 2);
            mainCtx.fill();

        } else if (obstacle.type === 'truck') {
            mainCtx.fillStyle = 'rgba(0,0,0,0.5)'; // Darker color for truck details
            // Cab
            mainCtx.fillRect(obstacleX, obstacleY, obstacle.width * 0.3, obstacle.height);
            // Trailer outline
            mainCtx.strokeStyle = 'rgba(0,0,0,0.5)';
            mainCtx.lineWidth = 2;
            mainCtx.strokeRect(obstacleX + obstacle.width * 0.3, obstacleY, obstacle.width * 0.7, obstacle.height);
            // Wheels
            mainCtx.fillStyle = '#333';
            mainCtx.beginPath();
            mainCtx.arc(obstacleX + obstacle.width * 0.15, obstacleY + obstacle.height * 0.85, obstacle.height * 0.1, 0, Math.PI * 2); // Front wheel
            mainCtx.arc(obstacleX + obstacle.width * 0.4, obstacleY + obstacle.height * 0.85, obstacle.height * 0.1, 0, Math.PI * 2); // Trailer wheel 1
            mainCtx.arc(obstacleX + obstacle.width * 0.65, obstacleY + obstacle.height * 0.85, obstacle.height * 0.1, 0, Math.PI * 2); // Trailer wheel 2
            mainCtx.arc(obstacleX + obstacle.width * 0.9, obstacleY + obstacle.height * 0.85, obstacle.height * 0.1, 0, Math.PI * 2); // Trailer wheel 3
            mainCtx.fill();

        } else if (obstacle.type === 'train') {
            mainCtx.fillStyle = 'rgba(0,0,0,0.5)'; // Darker color for train details
            // Windows
            mainCtx.fillRect(obstacleX + obstacle.width * 0.1, obstacleY + obstacle.height * 0.2, obstacle.width * 0.15, obstacle.height * 0.6);
            mainCtx.fillRect(obstacleX + obstacle.width * 0.3, obstacleY + obstacle.height * 0.2, obstacle.width * 0.15, obstacle.height * 0.6);
            mainCtx.fillRect(obstacleX + obstacle.width * 0.5, obstacleY + obstacle.height * 0.2, obstacle.width * 0.15, obstacle.height * 0.6);
            mainCtx.fillRect(obstacleX + obstacle.width * 0.7, obstacleY + obstacle.height * 0.2, obstacle.width * 0.15, obstacle.height * 0.6);
            // Connectors (simplified)
            mainCtx.fillStyle = '#666';
            mainCtx.fillRect(obstacleX - 5, obstacleY + obstacle.height / 2 - 2, 10, 4); // Left connector
            mainCtx.fillRect(obstacleX + obstacle.width - 5, obstacleY + obstacle.height / 2 - 2, 10, 4); // Right connector
            // Wheels (simplified rectangles at the bottom)
            mainCtx.fillStyle = '#333';
            mainCtx.fillRect(obstacleX + obstacle.width * 0.05, obstacleY + obstacle.height * 0.8, obstacle.width * 0.2, obstacle.height * 0.15);
            mainCtx.fillRect(obstacleX + obstacle.width * 0.3, obstacleY + obstacle.height * 0.8, obstacle.width * 0.2, obstacle.height * 0.15);
            mainCtx.fillRect(obstacleX + obstacle.width * 0.55, obstacleY + obstacle.height * 0.8, obstacle.width * 0.2, obstacle.height * 0.15);
            mainCtx.fillRect(obstacleX + obstacle.width * 0.8, obstacleY + obstacle.height * 0.8, obstacle.width * 0.15, obstacle.height * 0.15);
        }
      });

      // Draw collectibles
      level.collectibles.forEach(collectible => {
          mainCtx.fillStyle = collectible.color;
          mainCtx.beginPath();
          mainCtx.arc(collectible.x, collectible.y, collectible.size / 2, 0, Math.PI * 2);
          mainCtx.fill();
      });

      // Draw brushing value as text (will appear un-mirrored on screen)
      mainCtx.fillStyle = '#fff';
      mainCtx.font = '20px Arial';
      mainCtx.textAlign = 'right';
      mainCtx.textBaseline = 'top';
      mainCtx.fillText(`Brushing: ${brushingValue.toFixed(2)} (Smoothed: ${smoothedBrushingImpact.toFixed(2)})`, overlayWidth - 10, 10);


      // Game Over Text or Game Won Text
      if (gameOver) {
        let message = 'GAME OVER!';
        let subMessage = 'Time ran out. Click "Start camera" to play again.';
        let textColor = 'rgba(255, 0, 0, 0.7)';
        mainCtx.fillStyle = textColor;
        mainCtx.font = 'bold 48px Arial';
        mainCtx.textAlign = 'center';
        mainCtx.textBaseline = 'middle';
        mainCtx.fillText(message, overlayWidth / 2, overlayHeight / 2);
        mainCtx.font = 'bold 24px Arial';
        mainCtx.fillText(subMessage, overlayWidth / 2, overlayHeight / 2 + 40);
      }

      mainCtx.restore();
    }


    function loop(){
      rafId = requestAnimationFrame(loop);
      if (!detector || !ui.video.videoWidth) {
        if (gameOver && ui.video.srcObject) { // Clear canvas once on game over or game won
          mainCtx.clearRect(0,0,overlayWidth, overlayHeight);
          mainCtx.save();
          mainCtx.scale(-1, 1);
          mainCtx.translate(-overlayWidth, 0);

          let message = 'GAME OVER!';
          let subMessage = 'Time ran out. Click "Start camera" to play again.';
          let textColor = 'rgba(255, 0, 0, 0.7)';

          mainCtx.fillStyle = textColor;
          mainCtx.font = 'bold 48px Arial';
          mainCtx.textAlign = 'center';
          mainCtx.textBaseline = 'middle';
          mainCtx.fillText(message, overlayWidth / 2, overlayHeight / 2);
          mainCtx.font = 'bold 24px Arial';
          mainCtx.fillText(subMessage, overlayWidth / 2, overlayHeight / 2 + 40);
          mainCtx.restore();
        }
        return; // Don't proceed if game is over or camera/detector not ready
      }
      if (gameOver) return; // Prevent game logic from running if already over

      const now = performance.now();
      if (ui.video.currentTime !== lastTime) {
        lastTime = ui.video.currentTime;

        mainCtx.clearRect(0,0,overlayWidth, overlayHeight);
        mainCtx.drawImage(ui.video, 0, 0, overlayWidth, overlayHeight);

        const result = detector.detectForVideo(ui.video, now);
        let logLines = [];
        brushingValue *= BRUSHING_DECAY; // Apply decay to current brushing value

        let depthScale = 1.0; // Initialize depth scale

        if (result?.landmarks?.length) {
          ui.handsCount.textContent = String(result.landmarks.length);
          result.landmarks.forEach((lm, i) => {
            drawer.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { lineWidth: 3 });
            drawer.drawLandmarks(lm, { lineWidth: 1, radius: 3 });

            const rotation = estimateHandRotation(lm);
            const currentLaneCommand = getLaneFromPitch(rotation.pitch); // This now updates currentLaneState internally

            logLines.push(`Hand ${i+1}: Yaw: ${rotation.yaw}° Pitch: ${rotation.pitch}° Roll: ${rotation.roll}° -> Lane: ${currentLaneCommand}`);

            switch (currentLaneCommand) {
                case "up":
                    targetY = LANE_HEIGHT / 2;
                    break;
                case "down":
                    targetY = LANE_HEIGHT * 2.5;
                    break;
                case "front":
                default:
                    targetY = LANE_HEIGHT * 1.5;
                    break;
            }
            lastValidTargetY = targetY; // Update lastValidTargetY when a hand is detected

            if (lm.length > 0) {
              const currentX = lm[0].x * overlayWidth;
              const currentZ = lm[0].z; // Get the Z-coordinate of the wrist landmark

              // Calculate depth scaling factor
              // If currentZ is more negative (further away), depthScale will be > 1
              // If currentZ is less negative (closer), depthScale will be < 1
              // The `DEPTH_SCALING_FACTOR` determines how sensitive this scaling is.
              depthScale = Math.pow(REFERENCE_DEPTH_Z / currentZ, DEPTH_SCALING_FACTOR);
              // Ensure depthScale doesn't become too extreme or negative
              depthScale = Math.max(0.5, Math.min(depthScale, 3.0)); // Clamp between reasonable values

              handXPositions.push(currentX);
              if (handXPositions.length > HISTORY_SIZE) {
                handXPositions.shift();
              }

              if (handXPositions.length === HISTORY_SIZE) {
                let minX = handXPositions[0];
                let maxX = handXPositions[0];
                for (let j = 1; j < HISTORY_SIZE; j++) {
                  if (handXPositions[j] < minX) minX = handXPositions[j];
                  if (handXPositions[j] > maxX) maxX = handXPositions[j];
                }
                const range = maxX - minX;

                let totalMovement = 0;
                for (let j = 1; j < HISTORY_SIZE; j++) {
                  totalMovement += Math.abs(handXPositions[j] - handXPositions[j-1]);
                }

                // Apply depth scaling to the brushing calculation
                const currentBrushing = ((range * 0.01) + (totalMovement * 0.005)) * depthScale;
                if (currentBrushing > brushingValue) {
                    brushingValue = currentBrushing;
                }
              }
            }
          });
        } else {
          ui.handsCount.textContent = "0";
          logLines.push("No hand detected. Using last valid lane.");
          // Use the last known valid lane position
          targetY = lastValidTargetY; 
          // currentLaneState = "front"; // Optional: reset state if hand is not detected
          handXPositions = [];
        }

        // Apply smoothing to the brushing impact
        smoothedBrushingImpact = smoothedBrushingImpact * (1 - SMOOTHING_ALPHA) + brushingValue * SMOOTHING_ALPHA;
        
        ui.brushingValue.textContent = brushingValue.toFixed(2);

        // Game logic updates
        // Move obstacles and check for collisions
        let collidedObstacleIndex = -1;

        for (let i = level.obstacles.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
          const obstacle = level.obstacles[i];

          // Use the smoothedBrushingImpact for obstacle movement
          const obstacleMovement = obstacle.speed + (smoothedBrushingImpact * BRUSHING_IMPACT_FACTOR);
          obstacle.x -= obstacleMovement;

          if (checkCollision(objectX, objectY, PLAYER_SIZE, obstacle)) {
            collidedObstacleIndex = i;
          }

          // Check if obstacle is off screen to the left and create a new one
          if (obstacle.x + obstacle.width / 2 < 0) {
              level.obstacles.splice(i, 1); // Remove the off-screen obstacle
              // Add a new obstacle at the right edge, staggered
              const lastObstacle = level.obstacles[level.obstacles.length - 1];
              const newXPosition = lastObstacle ? lastObstacle.x + OBSTACLE_SPACING_DISTANCE : overlayWidth;
              level.obstacles.push(createNewObstacle(newXPosition));
          }
        }

        let pushBack = 0;

        if(collidedObstacleIndex != -1){
          const obstacle = level.obstacles[collidedObstacleIndex];
          if(objectX < obstacle.x - obstacle.width/2){
            pushBack = objectX + PLAYER_SIZE/2 - (obstacle.x - obstacle.width/2);
            for (let i = 0; i < level.obstacles.length; i++) {
              const obstacle = level.obstacles[i];
              obstacle.x += pushBack;
            }
          } else {
            const obstacleY =  LANE_HEIGHT * obstacle.lane + LANE_HEIGHT / 2;

            if(objectY < obstacleY){
              objectY = obstacleY - obstacle.height/2 - PLAYER_SIZE/2;
            } else {
              objectY = obstacleY + obstacle.height/2 + PLAYER_SIZE/2;
            }
            targetY = objectY;
          }
        }

        // Move collectibles and check for collisions
        for (let i = level.collectibles.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
            const collectible = level.collectibles[i];
            const collectibleMovement = level.baseObstacleSpeed + (smoothedBrushingImpact * BRUSHING_IMPACT_FACTOR) - pushBack;
            collectible.x -= collectibleMovement;

            if (checkCollision(objectX, objectY, PLAYER_SIZE, collectible)) {
                score++;
                ui.score.textContent = score;
                level.collectibles.splice(i, 1); // Remove collected item
                // Add a new collectible at the right edge, staggered
                const lastCollectible = level.collectibles[level.collectibles.length - 1];
                const newXPosition = lastCollectible ? lastCollectible.x + COLLECTIBLE_SPACING_DISTANCE : overlayWidth;
                const newCollectible = createNewCollectible(newXPosition);
                if (newCollectible) {
                    level.collectibles.push(newCollectible);
                }
            }

            // Check if collectible is off screen to the left and create a new one
            if (collectible.x + collectible.size / 2 < 0) {
                level.collectibles.splice(i, 1); // Remove the off-screen collectible
                // Add a new collectible at the right edge, staggered
                const lastCollectible = level.collectibles[level.collectibles.length - 1];
                const newXPosition = lastCollectible ? lastCollectible.x + COLLECTIBLE_SPACING_DISTANCE : overlayWidth;
                const newCollectible = createNewCollectible(newXPosition);
                if (newCollectible) {
                    level.collectibles.push(newCollectible);
                }
            }
        }


        drawGameOverlay();

        frames++;
        if (now - lastFpsUpdate > 1000) {
          ui.fps.textContent = String(frames);
          frames = 0; lastFpsUpdate = now;
        }

        if (logLines.length) {
          ui.log.textContent = logLines.join("\n");
        }
      }
    }

    ui.startBtn.addEventListener('click', async () => {
      try { await startCamera(); }
      catch (err) {
        console.error(err);
        ui.log.textContent = String(err);
        ui.startBtn.disabled = false;
        setLive(false);
      }});
    ui.stopBtn.addEventListener('click', stopCamera);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopCamera();
    });