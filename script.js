let canvasElement, canvas, n, movesP0, movesP1;
let width, height, FPS, pieces, moving, movesCount, ready, mousePos, mousePressed, mode, solveArray;
FPS = 60;
mode = 0; // 0 = manual, 1 = automatic

function solve(n, i, j) {
  if (n == 1) {
    return [
      [i, j]
    ];
  } else {
    let moves = [];
    moves.push(...solve(n - 1, i, 3 - i - j));
    moves.push(...solve(1, i, j));
    moves.push(...solve(n - 1, 3 - i - j, j));
    return moves;
  }
}

function colorize(value) {
  if (n == 1) {
    // 1 disk
    value = 0;
  } else {
    // multiple disks
    value = (value - 1) / (n - 1);
  }
  let r = Math.max(value * 200, 0);
  let g = 191 + value * 64;
  let b = 95 + value * 160;
  return "rgb(" + r + "," + g + "," + b + ")";
}

function drawPiece(x, y, value, realPos) {
  // if realPos is true, don't need to edit the position
  if (!realPos) {
    x += 90 - value * 10;
  }
  canvas.fillStyle = colorize(value);
  canvas.fillRect(x, y, (value + 1) * 20, 5);
  canvas.fill();
  canvas.fillStyle = colorize(value - 1.5);
  canvas.fillRect(x, y + 5, (value + 1) * 20, 15);
  canvas.fill();

}

function generate() {
  let value;
  for (let i = 1; i < 10; i++) {
    value = document.createElement("option");
    value.value = i;
    value.innerHTML = i;
    select.appendChild(value);
  }
  select.value = select.getAttribute("default"); // make a value default
}

function restart() {
  // reset counters and pieces positions
  mode = 0; // manual
  n = select.value; // update n
  solveArray = undefined;
  movesCount = 0;
  movesP1.innerHTML = "Optimal: " + (2 ** n - 1);
  ready = true; // ready to accept new actions from the player
  mousePos = {
    "x": 0,
    "y": 0
  };

  pieces = [
    [],
    [],
    []
  ];
  moving = undefined;
  for (let i = 1; i <= n; i++) {
    pieces[0].push(i);
  }
}

function start() {
  canvasElement = document.getElementById("canvas");
  select = document.getElementById("n");
  movesP0 = document.getElementById("moves0");
  movesP1 = document.getElementById("moves1");

  canvasElement.addEventListener("mousemove", updateMousePos);
  canvasElement.addEventListener("mousedown", press);
  canvasElement.addEventListener("mouseup", release);

  canvas = canvasElement.getContext('2d');
  width = canvasElement.width;
  height = canvasElement.height;

  generate();
  restart();

  window.setTimeout(mainLoop, 1 / FPS);
}

function draw() {
  canvas.clearRect(0, 0, width, height);

  let x = 50;
  for (let i = 0; i < pieces.length; i++) {
    // draw poles

    canvas.fillStyle = "#2d1e10";
    canvas.fillRect(x + 90, 45, 20, 200);
    canvas.fill();
    canvas.fillRect(x - 5, 245, 210, 20);
    canvas.fill();

    let width;
    if (pieces[i].length) {
      width = 95 - 10 * pieces[i][pieces[i].length - 1];
    } else {
      width = 95;
    }
    canvas.fillStyle = "#714b28";
    canvas.fillRect(x + 90, 45, 20, 5);
    canvas.fill();
    canvas.fillRect(x - 5, 245, width, 5);
    canvas.fill();
    canvas.fillRect(x + 205 - width, 245, width, 5);
    canvas.fill();

    // draw pieces
    let y = 245 - 20 * pieces[i].length;
    for (let j = 0; j < pieces[i].length; j++) {
      drawPiece(x, y, pieces[i][j], false);
      y += 20;
    }
    x += 300;

    // draw potential moving piece
    if (moving != undefined) {
      drawPiece(moving[2][0], moving[2][1], moving[1], true);
    }
  }

  // draw counters
  movesP0.innerHTML = "Moves: " + movesCount;
}

function move() {
  // move an eventual selected piece with the mouse

  if (mousePressed && (moving != undefined) && (moving[4] === 0)) {
    let x = 300 * moving[0];
    if (mousePos.y < 40 || moving[3]) {
      // be free from the pole
      moving[3] = true;
      // move freely in the original pole area
      moving[2][0] = Math.min(Math.max(mousePos.x - 10 * moving[1], 50 + x), x + 300);
      moving[2][1] = mousePos.y - 10;

    } else {
      // x position still stuck to the pole
      moving[2][0] = 140 + x - 10 * moving[1];
      // limit y to avoid merging with another piece
      moving[2][1] = Math.min(mousePos.y - 10, 225 - pieces[moving[0]].length * 20);
    }
  }
}

function updateMousePos(evt) {
  let bound = canvasElement.getBoundingClientRect();

  let x = evt.clientX - bound.left - canvasElement.clientLeft;
  let y = evt.clientY - bound.top - canvasElement.clientTop;

  mousePos = {
    "x": x,
    "y": y
  };
}

function showsolution() {
  if (ready) {
    mode = 1;
  }
}

function smoothMove(pos0, pos1, delay, f) {
  // move smoothly the moving piece from pos0 to pos1 in delay milliseconds
  function updatePos(pos0, pos1, t0, delay, f) {
    let n = (Date.now() - t0) / delay;
    if (n > 1) {
      f();
    } else {
      // smoothly move
      moving[2][0] = pos0[0] + (pos1[0] - pos0[0]) * n;
      moving[2][1] = pos0[1] + (pos1[1] - pos0[1]) * n;
      window.setTimeout(() => {
        updatePos(pos0, pos1, t0, delay, f);
      }, 1 / FPS);
    }
  }

  updatePos(pos0, pos1, Date.now(), delay, f);
}

function takePieceFrom(index) {
  if (pieces[index].length != 0) {
    let value = pieces[index].splice(0, 1)[0];

    // [original pole, value, pos, free from pole, state]
    // state values: 0 = dragging, 1 = moving, 2 = dropping
    moving = [index, value, [140 + 300 * index - 10 * value, 225 - pieces[index].length * 20], false, 0];
  }
}

function dropMovingPiece(index) {
  function after1() {
    // executed after the first animation
    moving[4] = 2; // drop animation
    smoothMove(pos, [140 + 300 * index - 10 * moving[1], 225 - pieces[index].length * 20], 300, after2);
  }

  function after2() {
    // executed after the second animation
    pieces[index].splice(0, 0, moving[1]);
    moving = undefined // reset
    movesCount += 1;
    ready = true;
  }

  if (pieces[index].length && (pieces[index][0] < moving[1])) {
    // if the piece below will be smaller and the target pole is not empty, go back to the original pole
    index = moving[0];
  }

  // animation
  moving[4] = 1; // horizontal moving animation
  pos = [140 + 300 * index - 10 * moving[1], 15] // above the target pole
  ready = false;
  smoothMove([...moving[2]], pos, 200, after1);
}

function press() {
  mousePressed = true;
  if (ready && (mode === 0)) { // no animation playing
    let index;
    if (mousePos.x < 300) {
      index = 0;
    } else if (mousePos.x < 600) {
      index = 1;
    } else {
      index = 2;
    }

    if (moving === undefined) {
      // remove the top piece from the pole
      takePieceFrom(index);
    } else if (moving[4] === 0) {
      // drop it if it is possible
      dropMovingPiece(index);
    }
  }
}

function release(evt) {
  // avoid getting events from the mouse if in solution mode
  if ((evt != undefined) && (mode !== 0)) {
    return;
  }

  // smoothly move the selected piece above its original pole
  mousePressed = false;
  if (ready && (moving !== undefined) && (moving[4] === 0)) {
    ready = false;
    smoothMove([...moving[2]], [140 + 300 * moving[0] - 10 * moving[1], 15], 200, () => {
      ready = true
    });
  }
}

function mainLoop() {
  draw();

  if (mode === 0) {
    move();
  } else {
    if (solveArray === undefined) {
      // calculate the solution
      restart();
      mode = 1;
      solveArray = solve(n, 0, 2);
    }
    // solve
    if (solveArray.length) {
      if (moving === undefined) {
        // drag
        takePieceFrom(solveArray[0][0]);
        release();
      } else if (ready && (moving[4] === 0)) {
        // drop
        dropMovingPiece(solveArray[0][1]);
        solveArray.splice(0, 1);
      }
    }
  }

  if (pieces[2].length == n) {
    if (mode === 0) {
      alert("You completed the puzzle in MOVES moves!\nThe minimum is MIN moves.\nPress OK to restart:".replace("MOVES", movesCount).replace("MIN", 2 ** n - 1));
    } else {
      alert("The puzzle is completed in the least amount of moves possible, i.e. MIN moves.".replace("MIN", 2 ** n - 1));
    }
    restart();
  }

  window.setTimeout(mainLoop, 1 / FPS);
}
