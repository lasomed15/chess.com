const board = document.getElementById('chessboard');
const whiteTimerEl = document.getElementById('white-timer');
const blackTimerEl = document.getElementById('black-timer');
const turnEl = document.getElementById('turn');

const pieces = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

let startPosition = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

let selected = null;
let legalMoves = [];
let turn = 'white';
let whiteTime = 10 * 60;
let blackTime = 10 * 60;
let timerInterval = null;

function createBoard() {
  board.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add((row + col) % 2 === 0 ? 'white' : 'black');
      square.dataset.row = row;
      square.dataset.col = col;
      square.textContent = pieces[startPosition[row][col]] || '';
      
      if (selected && selected.row === row && selected.col === col) {
        square.classList.add('selected');
      }
      if (legalMoves.some(m => m.row === row && m.col === col)) {
        square.classList.add('highlight');
      }
      if (isCheck(turn) && startPosition[row][col].toLowerCase() === 'k' &&
          ((turn === 'white' && startPosition[row][col]==='K') || (turn==='black' && startPosition[row][col]==='k'))) {
        square.classList.add('check');
      }

      square.addEventListener('click', () => onSquareClick(row, col));
      board.appendChild(square);
    }
  }
  turnEl.textContent = turn.charAt(0).toUpperCase() + turn.slice(1) + "'s Turn";
}

function onSquareClick(row, col) {
  const piece = startPosition[row][col];

  if (selected) {
    if (legalMoves.some(m => m.row === row && m.col === col)) {
      startPosition[row][col] = startPosition[selected.row][selected.col];
      startPosition[selected.row][selected.col] = '';

      // Pawn promotion
      if (startPosition[row][col].toLowerCase() === 'p') {
        if ((startPosition[row][col] === 'P' && row === 0) || (startPosition[row][col] === 'p' && row === 7)) {
          const promo = createPromotionPopup(startPosition[row][col] === 'P');
          startPosition[row][col] = promo;
        }
      }

      if (isCheck(getOpponentColor(turn))) {
        if (isCheckmate(getOpponentColor(turn))) {
          turnEl.textContent = `${turn.charAt(0).toUpperCase() + turn.slice(1)} wins by checkmate!`;
          setTimeout(resetGame, 2000);
          return;
        } else {
          turnEl.textContent = `${getOpponentColor(turn).charAt(0).toUpperCase() + getOpponentColor(turn).slice(1)} is in check!`;
        }
      }

      turn = getOpponentColor(turn);
    }
    selected = null;
    legalMoves = [];
    createBoard();
  } else {
    if (piece && isPlayersTurn(piece)) {
      selected = {row, col};
      legalMoves = getLegalMoves(row, col);
      createBoard();
    }
  }
}

function isPlayersTurn(piece) {
  return (turn === 'white' && piece === piece.toUpperCase()) ||
         (turn === 'black' && piece === piece.toLowerCase());
}

function getOpponentColor(color) {
  return color === 'white' ? 'black' : 'white';
}

function getLegalMoves(r1, c1) {
  const moves = [];
  for (let r=0;r<8;r++){
    for (let c=0;c<8;c++){
      if (isLegalMove(r1,c1,r,c)){
        const backupFrom = startPosition[r1][c1];
        const backupTo = startPosition[r][c];
        startPosition[r][c] = backupFrom;
        startPosition[r1][c1] = '';
        if (!isCheck(turn)) moves.push({row:r,col:c});
        startPosition[r1][c1] = backupFrom;
        startPosition[r][c] = backupTo;
      }
    }
  }
  return moves;
}

function isLegalMove(r1, c1, r2, c2) {
  const piece = startPosition[r1][c1];
  const target = startPosition[r2][c2];
  if (target && ((piece === piece.toUpperCase() && target === target.toUpperCase()) ||
                 (piece === piece.toLowerCase() && target === target.toLowerCase()))) return false;

  const dr = r2 - r1;
  const dc = c2 - c1;

  switch(piece.toLowerCase()) {
    case 'p':
      if (piece === 'P') {
        if (dc === 0 && dr === -1 && !target) return true;
        if (dc === 0 && dr === -2 && r1 === 6 && !target && !startPosition[r1-1][c1]) return true;
        if (Math.abs(dc) === 1 && dr === -1 && target && target === target.toLowerCase()) return true;
      } else {
        if (dc === 0 && dr === 1 && !target) return true;
        if (dc === 0 && dr === 2 && r1 === 1 && !target && !startPosition[r1+1][c1]) return true;
        if (Math.abs(dc) === 1 && dr === 1 && target && target === target.toUpperCase()) return true;
      }
      return false;
    case 'r': if (dr===0||dc===0) return isPathClear(r1,c1,r2,c2); return false;
    case 'n': return (Math.abs(dr)===2 && Math.abs(dc)===1)||(Math.abs(dr)===1 && Math.abs(dc)===2);
    case 'b': if (Math.abs(dr)===Math.abs(dc)) return isPathClear(r1,c1,r2,c2); return false;
    case 'q': if (dr===0||dc===0||Math.abs(dr)===Math.abs(dc)) return isPathClear(r1,c1,r2,c2); return false;
    case 'k': return Math.abs(dr)<=1 && Math.abs(dc)<=1;
    default: return false;
  }
}

function isPathClear(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  let r = r1 + dr, c = c1 + dc;
  while (r!==r2||c!==c2){ if(startPosition[r][c]!=='') return false; r+=dr;c+=dc;}
  return true;
}

function isCheck(color){
  const king = color==='white'?'K':'k';
  let kingPos=null;
  for (let r=0;r<8;r++){for(let c=0;c<8;c++){if(startPosition[r][c]===king) kingPos={r,c};}}
  for (let r=0;r<8;r++){for(let c=0;c<8;c++){
    const piece = startPosition[r][c];
    if(piece && ((color==='white' && piece===piece.toLowerCase())||(color==='black' && piece===piece.toUpperCase()))){
      if(isLegalMove(r,c,kingPos.r,kingPos.c)) return true;
    }
  }}
  return false;
}

function isCheckmate(color){
  for(let r1=0;r1<8;r1++){for(let c1=0;c1<8;c1++){
    const piece = startPosition[r1][c1];
    if(piece && ((color==='white' && piece===piece.toUpperCase())||(color==='black' && piece===piece.toLowerCase()))){
      for(let r2=0;r2<8;r2++){for(let c2=0;c2<8;c2++){
        if(isLegalMove(r1,c1,r2,c2)){
          const backupFrom = startPosition[r1][c1];
          const backupTo = startPosition[r2][c2];
          startPosition[r2][c2] = backupFrom; startPosition[r1][c1]='';
          const stillCheck=isCheck(color);
          startPosition[r1][c1]=backupFrom; startPosition[r2][c2]=backupTo;
          if(!stillCheck) return false;
        }
      }}
    }
  }}
  return true;
}

// Timer
function startTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    if(turn==='white') whiteTime--; else blackTime--;
    whiteTimerEl.textContent=formatTime(whiteTime);
    blackTimerEl.textContent=formatTime(blackTime);
    if(whiteTime<=0){turnEl.textContent='Black wins by timeout!';setTimeout(resetGame,2000);}
    if(blackTime<=0){turnEl.textContent='White wins by timeout!';setTimeout(resetGame,2000);}
  },1000);
}

function formatTime(seconds){
  const m=Math.floor(seconds/60).toString().padStart(2,'0');
  const s=(seconds%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function resetGame(){
  startPosition = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  turn='white'; whiteTime=blackTime=10*60; selected=null; legalMoves=[];
  createBoard(); startTimer();
}

// --- Pawn promotion popup ---
function createPromotionPopup(isWhite){
  let choice = prompt("Promote pawn to (Q, R, B, N):", "Q");
  choice = choice ? choice.toUpperCase() : "Q";
  const valid = ["Q","R","B","N"];
  if(!valid.includes(choice)) choice = "Q";
  return isWhite ? choice : choice.toLowerCase();
}

createBoard();
startTimer();
