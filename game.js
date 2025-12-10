import { ref, set, onValue, get, push } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const db = window.db;
const auth = window.auth;

// URL param
const params = new URLSearchParams(window.location.search);
const gameId = params.get('gameId');
if(!gameId){ alert("No gameId"); window.location.href='lobby.html'; }

const gameRef = ref(db,'games/'+gameId);

// DOM Elements
const boardEl = document.getElementById('chessboard');
const whiteTimerEl = document.getElementById('white-timer');
const blackTimerEl = document.getElementById('black-timer');
const turnEl = document.getElementById('turn');
const whitePlayerEl = document.getElementById('whitePlayer');
const blackPlayerEl = document.getElementById('blackPlayer');
const promotionModal = document.getElementById('promotionModal');
const promotionOptions = document.getElementById('promotionOptions');

const pieces = {'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟','R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙'};

let board=[], turn='white', selected=null, legalMoves=[], pendingPromotion=null;
let whiteTime=600, blackTime=600, timerInterval=null, playerColor=null, level=null;
let currentUser=null;

// ---------------- AUTH ----------------
onAuthStateChanged(auth,user=>{
  if(!user) window.location.href='index.html';
  currentUser=user;
  loadGame();
});

// ---------------- LOAD GAME ----------------
function loadGame(){
  get(gameRef).then(snapshot=>{
    const game = snapshot.val();
    if(!game){ alert("Game not found"); window.location.href='lobby.html'; return; }

    if(game.white===currentUser.uid) playerColor='white';
    else if(game.black===currentUser.uid) playerColor='black';
    else if(game.black.startsWith('BOT')) playerColor='white';
    else playerColor='spectator';

    level = game.level || null;

    whitePlayerEl.textContent = game.whiteName || 'White';
    blackPlayerEl.textContent = game.blackName || game.black;

    board = game.board;
    turn = game.turn;
    whiteTime = game.whiteTime || 600;
    blackTime = game.blackTime || 600;

    startTimer();
    createBoard();

    onValue(gameRef,snapshot=>{
      const data = snapshot.val();
      if(!data) return;
      board = data.board;
      turn = data.turn;
      whiteTime = data.whiteTime;
      blackTime = data.blackTime;
      createBoard();

      // Bot move
      if(level && turn==='black') setTimeout(()=>botMove(level),800);
    });
  });
}

// ---------------- BOARD ----------------
function createBoard(){
  boardEl.innerHTML='';
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = document.createElement('div');
      sq.classList.add('square',(r+c)%2===0?'white':'black');
      sq.dataset.row=r;
      sq.dataset.col=c;
      sq.textContent = pieces[board[r][c]]||'';
      if(selected && selected.row===r && selected.col===c) sq.classList.add('selected');
      if(legalMoves.some(m=>m.row===r && m.col===c)) sq.classList.add('highlight');
      sq.addEventListener('click',()=>onSquareClick(r,c));
      boardEl.appendChild(sq);
    }
  }
  turnEl.textContent = `${turn.charAt(0).toUpperCase()+turn.slice(1)}'s Turn`;
  whiteTimerEl.textContent = formatTime(whiteTime);
  blackTimerEl.textContent = formatTime(blackTime);
}

// ---------------- MOVE ----------------
function onSquareClick(r,c){
  if(playerColor!==turn && playerColor!=='spectator') return;

  const piece = board[r][c];
  if(selected){
    if(legalMoves.some(m=>m.row===r && m.col===c)){
      board[r][c]=board[selected.row][selected.col];
      board[selected.row][selected.col]='';

      // Pawn promotion
      if(board[r][c].toLowerCase()==='p' && ((board[r][c]==='P' && r===0) || (board[r][c]==='p' && r===7))){
        pendingPromotion={row:r,col:c,piece:board[r][c]};
        promotionModal.classList.remove('hidden');
        selected=null; legalMoves=[]; createBoard(); return;
      }

      turn = turn==='white'?'black':'white';
      updateDatabase();
      if(level && turn==='black') setTimeout(()=>botMove(level),800);
    }
    selected=null; legalMoves=[];
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
    const {row,col,piece}=pendingPromotion;
    const choice = btn.dataset.piece;
    board[row][col] = piece==='P'?choice:choice.toLowerCase();
    pendingPromotion=null;
    promotionModal.classList.add('hidden');
    turn = turn==='white'?'black':'white';
    updateDatabase();
    if(level && turn==='black') setTimeout(()=>botMove(level),800);
  });
});

// ---------------- HELPERS ----------------
function isPlayersTurn(piece){
  return (turn==='white' && piece===piece.toUpperCase())||(turn==='black' && piece===piece.toLowerCase());
}

function getLegalMoves(r1,c1){
  const moves=[];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      if(isLegalMove(r1,c1,r,c)) moves.push({row:r,col:c});
    }
  }
  return moves;
}

// Simplified placeholder: replace with full legal move rules
function isLegalMove(r1,c1,r2,c2){
  return true;
}

function formatTime(sec){const m=Math.floor(sec/60).toString().padStart(2,'0'); const s=(sec%60).toString().padStart(2,'0'); return `${m}:${s}`;}

// ---------------- DATABASE ----------------
function updateDatabase(){ set(gameRef,{board,turn,whiteTime,blackTime,level}); }

// ---------------- TIMER ----------------
function startTimer(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    if(turn==='white') whiteTime--; else blackTime--;
    updateDatabase();
  },1000);
}

// ---------------- BOT ----------------
function botMove(level){
  let moves = getAllLegalMoves('black');
  if(moves.length===0) return;
  let move;
  if(level==='easy'){ move = moves[Math.floor(Math.random()*moves.length)]; }
  else if(level==='medium'){ move = moves.find(m=>board[m.to.row][m.to.col]) || moves[Math.floor(Math.random()*moves.length)]; }
  else { move = moves[0]; }

  board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
  board[move.from.row][move.from.col]='';
  turn='white';
  updateDatabase();
}

// Placeholder: implement real legal moves generator
function getAllLegalMoves(color){ 
  const moves=[];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const piece = board[r][c];
      if(piece && ((color==='white' && piece===piece.toUpperCase())||(color==='black' && piece===piece.toLowerCase()))){
        for(let r2=0;r2<8;r2++){
          for(let c2=0;c2<8;c2++){
            moves.push({from:{row:r,col:c},to:{row:r2,col:c2}});
          }
        }
      }
    }
  }
  return moves;
}
