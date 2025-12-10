import { ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const db = window.db;
const auth = window.auth;

// Get gameId from URL
const params = new URLSearchParams(window.location.search);
const gameId = params.get('gameId');
if(!gameId) { alert("No gameId found!"); window.location.href='lobby.html'; }

const gameRef = ref(db,'games/'+gameId);

// DOM Elements
const boardEl = document.getElementById('chessboard');
const whiteTimerEl = document.getElementById('white-timer');
const blackTimerEl = document.getElementById('black-timer');
const turnEl = document.getElementById('turn');
const promotionModal = document.getElementById('promotionModal');
const promotionOptions = document.getElementById('promotionOptions');
const whitePlayerEl = document.getElementById('whitePlayer');
const blackPlayerEl = document.getElementById('blackPlayer');

// Chess Symbols
const pieces = {
  'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟',
  'R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙'
};

// Game state
let board = [];
let turn = 'white';
let selected = null;
let legalMoves = [];
let whiteTime = 600;
let blackTime = 600;
let timerInterval = null;
let pendingPromotion = null;
let playerColor = null;

// ---------------- AUTH CHECK ----------------
onAuthStateChanged(auth,user=>{
  if(!user) window.location.href='index.html';
  else loadPlayerInfo(user);
});

function loadPlayerInfo(user){
  get(ref(db,'games/'+gameId)).then(snapshot=>{
    const game = snapshot.val();
    if(!game){ alert("Game not found!"); window.location.href='lobby.html'; return; }
    // Assign player color
    if(game.white===user.uid) playerColor='white';
    else if(game.black===user.uid) playerColor='black';
    else playerColor='spectator';

    whitePlayerEl.textContent = game.whiteName || 'White';
    blackPlayerEl.textContent = game.blackName || 'Black';

    initGame();
  });
}

// ---------------- GAME LOGIC ----------------
function initGame(){
  // Listen to changes in the game
  onValue(gameRef, snapshot=>{
    const data = snapshot.val();
    if(!data) return;

    board = data.board;
    turn = data.turn;
    whiteTime = data.whiteTime;
    blackTime = data.blackTime;
    createBoard();
  });

  // Start timers
  startTimer();
}

// ---------------- CREATE BOARD ----------------
function createBoard(){
  boardEl.innerHTML='';
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const square = document.createElement('div');
      square.classList.add('square',(r+c)%2===0?'white':'black');
      square.dataset.row=r;
      square.dataset.col=c;
      square.textContent = pieces[board[r][c]]||'';
      if(selected && selected.row===r && selected.col===c) square.classList.add('selected');
      if(legalMoves.some(m=>m.row===r && m.col===c)) square.classList.add('highlight');
      square.addEventListener('click',()=>onSquareClick(r,c));
      boardEl.appendChild(square);
    }
  }
  turnEl.textContent = `${turn.charAt(0).toUpperCase()+turn.slice(1)}'s Turn`;
  whiteTimerEl.textContent = formatTime(whiteTime);
  blackTimerEl.textContent = formatTime(blackTime);
}

// ---------------- SQUARE CLICK ----------------
function onSquareClick(r,c){
  const piece = board[r][c];
  if(playerColor!==turn && playerColor!=='spectator') return;
  if(selected){
    if(legalMoves.some(m=>m.row===r && m.col===c)){
      board[r][c]=board[selected.row][selected.col];
      board[selected.row][selected.col]='';

      // Pawn promotion
      if(board[r][c].toLowerCase()==='p'){
        if((board[r][c]==='P' && r===0) || (board[r][c]==='p' && r===7)){
          pendingPromotion={row:r,col:c,piece:board[r][c]};
          promotionModal.classList.remove('hidden');
          selected=null; legalMoves=[];
          createBoard(); return;
        }
      }

      turn = turn==='white'?'black':'white';
      updateDatabase();
    }
    selected=null;
    legalMoves=[];
    createBoard();
  } else {
    if(piece && isPlayersTurn(piece)){
      selected={row:r,col:c};
      legalMoves = getLegalMoves(r,c);
      createBoard();
    }
  }
}

// ---------------- PAWN PROMOTION ----------------
promotionOptions.querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(!pendingPromotion) return;
    const choice = btn.dataset.piece;
    const {row,col,piece} = pendingPromotion;
    board[row][col] = piece==='P'?choice:choice.toLowerCase();
    pendingPromotion=null;
    promotionModal.classList.add('hidden');
    turn = turn==='white'?'black':'white';
    updateDatabase();
  });
});

// ---------------- HELPERS ----------------
function isPlayersTurn(piece){
  return (turn==='white' && piece===piece.toUpperCase()) || (turn==='black' && piece===piece.toLowerCase());
}

function getLegalMoves(r1,c1){
  const moves=[];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      if(isLegalMove(r1,c1,r,c)){
        const b1=board[r1][c1], b2=board[r][c];
        board[r][c]=b1; board[r1][c1]='';
        if(!isCheck(turn)) moves.push({row:r,col:c});
        board[r1][c1]=b1; board[r][c]=b2;
      }
    }
  }
  return moves;
}

function isLegalMove(r1,c1,r2,c2){
  const piece=board[r1][c1], target=board[r2][c2];
  if(target && ((piece===piece.toUpperCase() && target===target.toUpperCase())||(piece===piece.toLowerCase() && target===target.toLowerCase()))) return false;
  const dr=r2-r1, dc=c2-c1;
  switch(piece.toLowerCase()){
    case 'p':
      if(piece==='P'){ if(dc===0 && dr===-1 && !target) return true; if(dc===0 && dr===-2 && r1===6 && !target && !board[r1-1][c1]) return true; if(Math.abs(dc)===1 && dr===-1 && target && target===target.toLowerCase()) return true;}
      else { if(dc===0 && dr===1 && !target) return true; if(dc===0 && dr===2 && r1===1 && !target && !board[r1+1][c1]) return true; if(Math.abs(dc)===1 && dr===1 && target && target===target.toUpperCase()) return true;}
      return false;
    case 'r': if(dr===0||dc===0) return isPathClear(r1,c1,r2,c2); return false;
    case 'n': return (Math.abs(dr)===2 && Math.abs(dc)===1)||(Math.abs(dr)===1 && Math.abs(dc)===2);
    case 'b': if(Math.abs(dr)===Math.abs(dc)) return isPathClear(r1,c1,r2,c2); return false;
    case 'q': if(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)) return isPathClear(r1,c1,r2,c2); return false;
    case 'k': return Math.abs(dr)<=1 && Math.abs(dc)<=1;
    default: return false;
  }
}

function isPathClear(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  let r=r1+dr, c=c1+dc;
  while(r!==r2 || c!==c2){ if(board[r][c]!=='') return false; r+=dr; c+=dc;}
  return true;
}

function isCheck(color){
  const king=color==='white'?'K':'k';
  let kingPos=null;
  for(let r=0;r<8;r++){for(let c=0;c<8;c++){if(board[r][c]===king) kingPos={r,c};}}
  for(let r=0;r<8;r++){for(let c=0;c<8;c++){
    const p=board[r][c];
    if(p && ((color==='white' && p===p.toLowerCase())||(color==='black' && p===p.toUpperCase()))){
      if(isLegalMove(r,c,kingPos.r,kingPos.c)) return true;
    }
  }} return false;
}

// ---------------- DATABASE ----------------
function updateDatabase(){
  set(gameRef,{board,turn,whiteTime,blackTime});
}

// ---------------- TIMER ----------------
function startTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    if(turn==='white') whiteTime--; else blackTime--;
    updateDatabase();
  },1000);
}

function formatTime(sec){
  const m=Math.floor(sec/60).toString().padStart(2,'0');
  const s=(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

// Start timer on load
startTimer();
