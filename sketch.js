// 全視窗畫布：背景 #606C38，支援多組動畫集（e5pig, c3, d4, b2）
// - e5pig: 原本的 idle 動畫（10 張，866x31）
// - c3: 跳躍動畫（15 張，970x55），由按上鍵啟動
// - d4: 左右移動動畫（7 張，408x34），由按左/右鍵啟動
// - b2: 下鍵動畫（11 張，666x51）

const ANIM_FPS = 12; // 動畫每秒幀數
let frameInterval = 1000 / ANIM_FPS;
let lastFrameTime = 0;

// 依資料夾預先定義每組的影格（明確列出檔名以避免 404）
const ANIM_SETS = {
  e5: { 
    path: 'e5pig', 
    files: ['0.png','1.png','2.png','3.png','4.png','7.png','8.png','9.png','10.png','11.png']
  },
  c3: { 
    path: 'c3', 
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png','11.png','12.png','13.png','14.png']
  },
  d4: { 
    path: 'd4', 
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png']
  },
  b2: { 
    path: 'b2', 
    files: ['0.png','1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png']
  }
};

// 載入後的影格陣列集合
let assets = {
  e5: [],
  c3: [],
  d4: [],
  b2: []
};

// 各動畫當前的幀索引（保留各自進度）
let frameIndices = {
  e5: 0,
  c3: 0,
  d4: 0,
  b2: 0
};

// 角色位置與移動（初始置中）
let px, py; // 中心座標
let vy = 0; // 垂直速度
let gravity = 0.6;
let jumpSpeed = -12;
let speed = 4; // 水平移動速度

// 朝向（1 = 面向右, -1 = 面向左）
let facing = 1;

// 追蹤上一次按的左/右方向（0 = 沒按, 1 = 右, -1 = 左）
let lastHorizontalDir = 0;
// 追蹤是否正在播放 d4 轉身動畫
let playingTurnAnim = false;

function preload() {
  // 依明確列表載入每組影格
  for (const key in ANIM_SETS) {
    const set = ANIM_SETS[key];
    for (let i = 0; i < set.files.length; i++) {
      assets[key].push(loadImage(set.path + '/' + set.files[i]));
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  noSmooth();
  frameRate(60);

  // 角色起始在畫面正中央
  px = width / 2;
  py = height / 2;
}

function draw() {
  background('#606C38');

  // 判斷按鍵（支援同時按）
  const up = keyIsDown(UP_ARROW);
  const down = keyIsDown(DOWN_ARROW);
  const left = keyIsDown(LEFT_ARROW);
  const right = keyIsDown(RIGHT_ARROW);

  // 決定當前水平方向
  let currentHorizontalDir = 0;
  if (left) currentHorizontalDir = -1;
  else if (right) currentHorizontalDir = 1;

  // 檢查是否發生方向改變（例如從按右變成按左，或從按右變成放開）
  // 只有當：(1) 之前有按左/右，(2) 現在改變了，或 (3) 現在改變方向時
  if (currentHorizontalDir !== 0 && currentHorizontalDir !== lastHorizontalDir && lastHorizontalDir !== 0) {
    // 方向改變了（例如從 1 變成 -1，或從 -1 變成 1），播放一次 d4
    playingTurnAnim = true;
    frameIndices['d4'] = 0; // 重置 d4 的幀索引
  }

  // 如果 d4 轉身動畫播放完一遍，就回到 e5
  if (playingTurnAnim && frameIndices['d4'] === 0 && lastFrameTime > 0) {
    // 動畫結束判定：當幀推進回到 0 時
    // （需要額外邏輯來判定「剛好轉過一圈」）
  }

  // 簡化邏輯：如果正在轉身且轉身動畫已播放至最後一幀，標記完成
  // 這邊我們用一個計數器來追蹤 d4 播放的次數
  
  // 決定當前動畫集（優先順序：Up > Down > 轉身中(d4) > idle(e5)）
  let active = 'e5';
  if (up) {
    active = 'c3';
    playingTurnAnim = false;
  }
  else if (down) {
    active = 'b2';
    playingTurnAnim = false;
  }
  else if (playingTurnAnim) {
    active = 'd4';
  }
  else if (left || right) {
    // 持續按左/右但沒有轉身，就用 e5
    active = 'e5';
  }

  // 更新上一次的方向
  lastHorizontalDir = currentHorizontalDir;

  // 水平移動（可與其他鍵並行）
  if (left) {
    px -= speed;
    facing = -1;
  }
  if (right) {
    px += speed;
    facing = 1;
  }

  // 簡單跳躍：當按上鍵時啟動向上速度（只有在地面時才可再次跳）
  const groundY = height / 2; // 我們將「地面」設在畫面垂直中線（原先置中）
  // 如果按上就嘗試跳（但避免一直套用初速度）
  if (up && abs(py - groundY) < 0.5 && vy === 0) {
    vy = jumpSpeed;
  }

  // 應用重力與位置更新
  vy += gravity;
  py += vy;

  // 碰地處理
  if (py > groundY) {
    py = groundY;
    vy = 0;
  }

  // 時間驅動的幀更新（每組保有自己的幀索引）
  if (millis() - lastFrameTime >= frameInterval) {
    lastFrameTime = millis();
    // 進到下一幀
    frameIndices[active] = (frameIndices[active] + 1) % assets[active].length;
    
    // 如果 d4 動畫播放完整一圈，結束轉身狀態
    if (playingTurnAnim && active === 'd4' && frameIndices[active] === 0) {
      playingTurnAnim = false;
    }
  }

  // 取得當前影格
  const img = assets[active][frameIndices[active]];

  // 畫出角色（在 px,py）
  if (img) {
    push();
    translate(px, py);
    // 水平翻轉以反映朝向
    scale(facing, 1);
    image(img, 0, 0);
    pop();
  } else {
    // 若該組沒影格，顯示提示文字
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Animation "' + active + '" not loaded', width / 2, height / 2);
  }

  // 可選：保持角色在畫布內
  px = constrain(px, 0 + 1, width - 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  // 防止瀏覽器滾動箭頭鍵的預設行為
  if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(keyCode)) {
    return false; // p5.js 會 preventDefault
  }
}
