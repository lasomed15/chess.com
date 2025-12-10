import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const db = window.db;
const leaderboardList = document.getElementById('leaderboardList');

const ratingsRef = ref(db,'users');

onValue(ratingsRef,snapshot=>{
  const data = snapshot.val() || {};
  const sorted = Object.values(data).sort((a,b)=> (b.elo||1200)-(a.elo||1200));
  leaderboardList.innerHTML='';
  sorted.forEach(player=>{
    const li = document.createElement('li');
    li.textContent = `${player.name || 'Anonymous'} - ELO: ${player.elo || 1200}`;
    leaderboardList.appendChild(li);
  });
});
