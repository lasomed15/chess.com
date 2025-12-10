import { ref, set, push, onValue, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = window.auth;
const db = window.db;

const playersList = document.getElementById('playersList');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser=null;
let userUid=null;

onAuthStateChanged(auth,user=>{
  if(!user) window.location.href='index.html';
  currentUser=user;
  userUid=user.uid;
  initLobby();
});

logoutBtn.addEventListener('click', ()=>{
  signOut(auth).then(()=> window.location.href='index.html');
});

function initLobby(){
  // Add current user if not exist
  set(ref(db,'users/'+userUid),{name:currentUser.displayName||currentUser.email,online:true});

  // Show all signed-up players
  const usersRef = ref(db,'users');
  onValue(usersRef,snapshot=>{
    const data=snapshot.val()||{};
    playersList.innerHTML='';
    for(const uid in data){
      if(uid!==userUid){
        const li = document.createElement('li');
        li.textContent = data[uid].name;

        const playBtn = document.createElement('button');
        playBtn.textContent = 'Play vs';
        playBtn.addEventListener('click', ()=>startGame(uid));

        li.appendChild(playBtn);
        playersList.appendChild(li);
      }
    }
  });
}

// Create a new game instantly vs a player
function startGame(opponentUid){
  const newGameRef = push(ref(db,'games'));
  const gameId = newGameRef.key;

  set(newGameRef,{
    white: userUid,
    black: opponentUid,
    board:[
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ],
    turn:'white',
    whiteTime:600,
    blackTime:600,
    whiteName: currentUser.displayName||currentUser.email,
    blackName: 'Waiting...' // will update automatically for opponent
  });

  window.location.href='game.html?gameId='+gameId;
}

// ---------------- BOT GAMES ----------------
window.startBotGame = function(level){
  const newGameRef = push(ref(db,'games'));
  const gameId = newGameRef.key;

  set(newGameRef,{
    white: userUid,
    black: 'BOT_'+level,
    board:[
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ],
    turn:'white',
    whiteTime:600,
    blackTime:600,
    whiteName: currentUser.displayName||currentUser.email,
    blackName: 'Bot ('+level+')',
    level: level
  });

  window.location.href='game.html?gameId='+gameId;
}
