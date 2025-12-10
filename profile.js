import { ref, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = window.auth;
const db = window.db;

const usernameEl = document.getElementById('username');
const eloEl = document.getElementById('elo');
const winsEl = document.getElementById('wins');
const lossesEl = document.getElementById('losses');

onAuthStateChanged(auth,user=>{
  if(!user) window.location.href='index.html';
  else loadProfile(user);
});

function loadProfile(user){
  const userRef = ref(db,'users/'+user.uid);
  get(userRef).then(snapshot=>{
    const data = snapshot.val() || {};
    usernameEl.textContent = data.name || user.email;
    eloEl.textContent = data.elo || 1200;
    winsEl.textContent = data.wins || 0;
    lossesEl.textContent = data.losses || 0;
  });
}
