import { ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = window.auth;
const db = window.db;

const friendsList = document.getElementById('friendsList');
const invitesList = document.getElementById('invitesList');
const createGameBtn = document.getElementById('createGameBtn');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser=null;
let userUid=null;

// Redirect if not logged in
onAuthStateChanged(auth,user=>{
  if(!user) window.location.href='index.html';
  currentUser=user;
  userUid=user.uid;
  initLobby();
});

logoutBtn.addEventListener('click', ()=>{
  signOut(auth).then(()=> window.location.href='index.html');
});

// --- Lobby logic ---
function initLobby(){
  const usersRef = ref(db,'users');
  const invitesRef = ref(db,'invitations/'+userUid);

  // Add current user if not exist
  set(ref(db,'users/'+userUid),{name:currentUser.displayName||currentUser.email,online:true});

  // Show online friends
  onValue(usersRef,snapshot=>{
    const data=snapshot.val()||{};
    friendsList.innerHTML='';
    for(const uid in data){
      if(uid!==userUid){
        const li=document.createElement('li');
        li.textContent=data[uid].name;
        const btn=document.createElement('button');
        btn.textContent='Invite';
        btn.addEventListener('click', ()=> sendInvite(uid));
        li.appendChild(btn);
        friendsList.appendChild(li);
      }
    }
  });

  // Show invitations
  onValue(invitesRef,snapshot=>{
    const data=snapshot.val()||{};
    invitesList.innerHTML='';
    for(const key in data){
      const li=document.createElement('li');
      li.textContent = `Game invite from ${data[key].fromName}`;
      const acceptBtn=document.createElement('button');
      acceptBtn.textContent='Accept';
      acceptBtn.addEventListener('click', ()=>{
        window.location.href='game.html?gameId='+data[key].gameId;
        remove(ref(db,'invitations/'+userUid+'/'+key));
      });
      li.appendChild(acceptBtn);
      invitesList.appendChild(li);
    }
  });
}

function sendInvite(toUid){
  const newGameRef = push(ref(db,'games'));
  const gameId = newGameRef.key;
  // Add initial board & info
  set(newGameRef,{
    white:userUid,
    black:toUid,
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
    blackTime:600
  });
  // Add invitation to friend
  set(ref(db,'invitations/'+toUid+'/'+newGameRef.key),{
    from:userUid,
    fromName:currentUser.displayName||currentUser.email,
    gameId
  });
}

createGameBtn.addEventListener('click', ()=>{
  alert("Invite a friend to start a new game!");
});
