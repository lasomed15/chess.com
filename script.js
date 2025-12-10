import { ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const boardEl = document.getElementById('chessboard');
const whiteTimerEl = document.getElementById('white-timer');
const blackTimerEl = document.getElementById('black-timer');
const turnEl = document.getElementById('turn');
const promotionModal = document.getElementById('promotionModal');
const promotionOptions = document.getElementById('promotionOptions');
const authModal = document.getElementById('authModal');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');
const whitePlayerEl = document.getElementById('whitePlayer');
const blackPlayerEl = document.getElementById('blackPlayer');

const pieces = {
  'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟',
  'R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙'
};

let board = [
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
let whiteTime = 10*60;
let blackTime = 10*60;
let timerInterval = null;
let pendingPromotion = null;
let playerColor = null; // 'white' or 'black'

// Firebase Realtime Database reference
const gameRef = ref(db, 'games/game1');
const playersRef = ref(db, 'games/game1/players');

// Authentication
const auth = window.auth;
const provider = new GoogleAuthProvider();

// -------- AUTH HANDLERS --------

// Sign-up
signupBtn.addEventListener('click', ()=>{
  const email = emailInput.value;
  const password = passwordInput.value;
  createUserWithEmailAndPassword(auth,email,password)
    .then(userCredential=>{
      console.log("Signed up:", userCredential.user.email);
    }).catch(err=>alert(err.message));
});

// Login
loginBtn.addEventListener('click', ()=>{
  const email = emailInput.value;
  const password = passwordInput.value;
  signInWithEmailAndPassword(auth,email,password)
    .then(userCredential=>{
      console.log("Logged in:", userCredential.user.email);
    }).catch(err=>alert(err.message));
});

// Google Login
googleBtn.addEventListener('click', ()=>{
  signInWithPopup(auth, provider)
    .then(result=>{
      console.log("Google Sign-In:", result.user.displayName);
    }).catch(err=>alert(err.message));
});

// Monitor auth state
onAuthStateChanged(auth, user=>{
  if(user){
    authModal.classList.add('hidden');
    assignPlayer(user);
  } else {
    authModal.classList.remove('hidden');
  }
});

// -------- PLAYER ASSIGNMENT --------
function assignPlayer(user){
  get(playersRef).then(snapshot=>{
    const data = snapshot.val() || {};
    if(!data.white){
      playerColor='white';
      set(ref(db,'games/game1/players/white'),{uid:user.uid,name:user.displayName||user.email});
    } else if(!data.black && data.white.uid!==user.uid){
      playerColor='black';
      set(ref(db,'games/game1/players/black'),{uid:user.uid,name:user.displayName||user.email});
    } else {
      playerColor='spectator';
      alert("You are a spectator!");
    }
    updatePlayerDisplay();
  });
}

function updatePlayerDisplay(){
  onValue(playersRef, snapshot=>{
    const data = snapshot.val()||{};
    whitePlayerEl.textContent = data.white?.name || "Waiting...";
    blackPlayerEl.textContent = data.black?.name || "Waiting...";
  });
}

// -------- GAME LOGIC --------
onValue(gameRef, snapshot=>{
  const data = snapshot.val();
  if(!data) return;
  board = data.board;
  turn = data.turn;
  whiteTime = data.whiteTime;
  blackTime = data.blackTime;
  createBoard();
});

function updateDatabase(){
  set(gameRef, {board, turn, whiteTime, blackTime});
}

function createBoard(){
  boardEl.innerHTML='';
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const square = document.createElement('div');
      square.classList.add('square',(r+c)%2===0?'white':'black');
      square.dataset.row=r; square.dataset.col=c;
      square.textContent = pieces[board[r][c]]||'';
      if(selected && selected.row===r && selected.col===c) square.classList.add('selected');
      if(legalMoves.some(m=>m.row===r && m.col===c)) square.classList.add('highlight');
      if(isCheck(turn) && board[r][c].toLowerCase()==='k' &&
        ((turn==='white' && board[r][c]==='K')||(turn==='black' && board[r][c]==='k')))
        square.classList.add('check');

      square.addEventListener('click',()=>onSquareClick(r,c));
      boardEl.appendChild(square);
    }
  }
  turnEl.textContent = turn.charAt(0).toUpperCase()+turn.slice(1)+"'s Turn";
  whiteTimerEl.textContent=formatTime(whiteTime);
  blackTimerEl.textContent=formatTime(blackTime);
}

function onSquareClick(r,c){
  const piece=board[r][c];
  if(playerColor!==turn && playerColor!=='spectator') return; // only player's turn
  if(selected){
    if(legalMoves.some(m=>m.row===r && m.col===c)){
      board[r][c]=board[selected.row][selected.col];
      board[selected.row][selected.col]='';

      // Pawn promotion
      if(board[r][c].toLowerCase()==='p'){
        if((board[r][c]==='P' && r===0)||(board[r][c]==='p' && r===7)){
          pendingPromotion={row:r,col:c,piece:board[r][c]};
          promotionModal.classList.remove('hidden');
          selected=null; legalMoves=[];
          createBoard(); return;
        }
      }

      if(isCheck(getOpponentColor(turn))){
        if(isCheckmate(getOpponentColor(turn))){
          turnEl.textContent = `${turn.charAt(0).toUpperCase()+turn.slice(1)} wins by checkmate!`;
          setTimeout(resetGame,2000);
          updateDatabase(); return;
        } else {
          turnEl.textContent = `${getOpponentColor(turn).charAt(0).toUpperCase()+getOpponentColor(turn).slice(1)} is in check!`;
        }
      }

      turn=getOpponentColor(turn);
      updateDatabase();
    }
    selected=null; legalMoves=[];
    createBoard();
  } else {
    if(piece && isPlayersTurn(piece)){
      selected={row:r,col:c};
      legalMoves=getLegalMoves(r,c);
      createBoard();
    }
  }
}

// Pawn promotion buttons
promotionOptions.querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(!pendingPromotion) return;
    const choice = btn.dataset.piece;
    const {row,col,piece} = pendingPromotion;
    board[row][col] = piece==='P'?choice:choice.toLowerCase();
    pendingPromotion=null;
    promotionModal.classList.add('hidden');

    if(isCheck(getOpponentColor(turn))){
      if(isCheckmate(getOpponentColor(turn))){
        turnEl.textContent = `${turn.charAt(0).toUpperCase()+turn.slice(1)} wins by checkmate!`;
        setTimeout(resetGame,2000);
        updateDatabase(); return;
      } else {
        turnEl.textContent = `${getOpponentColor(turn).charAt(0).toUpperCase()+getOpponentColor(turn).slice(1)} is in check!`;
      }
    }

    turn=getOpponentColor(turn);
    updateDatabase();
    createBoard();
  });
});

// Utility functions
function isPlayersTurn(piece){
  return (turn==='white' && piece===piece.toUpperCase())||(turn==='black' && piece===piece.toLowerCase());
}

function getOpponentColor(color){ return color==='white'?'black':'white'; }

function getLegalMoves(r1,c1){ /* same logic as before */ 
  const moves=[];
  for(let r=0;r<8;r++){for(let c=0;c<8;c++){
    if(isLegalMove(r1,c1,r,c)){
      const b1=board[r1][c1], b2=board[r][c];
      board[r][c]=b1; board[r1][c1]='';
      if(!isCheck(turn)) moves.push({row:r,col:c});
      board[r1][c1]=b1; board[r][c]=b2;
    }
  }} return moves;
}

function isLegalMove(r1,c1,r2,c2){ /* pawn/rook/knight/bishop/queen/king logic as before */ 
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

function isCheckmate(color){
  for(let r1=0;r1<8;r1++){for(let c1=0;c1<8;c1++){
    const piece=board[r1][c1];
    if(piece && ((color==='white' && piece===piece.toUpperCase())||(color==='black' && piece===piece.toLowerCase()))){
      for(let r2=0;r2<8;r2++){for(let c2=0;c2<8;c2++){
        if(isLegalMove(r1,c1,r2,c2)){
          const b1=board[r1][c1], b2=board[r2][c2];
          board[r2][c2]=b1; board[r1][c1]='';
          if(!isCheck(color)) { board[r1][c1]=b1; board[r2][c2]=b2; return false;}
          board[r1][c1]=b1; board[r2][c2]=b2;
        }
      }}
    }
  }} return true;
}

// Timer
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

function resetGame(){
  board=[
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  turn='white'; whiteTime=blackTime=10*60;
  selected=null; legalMoves=[]; pendingPromotion=null;
  createBoard(); updateDatabase();
}

// Start timer
startTimer();
