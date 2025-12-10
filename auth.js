import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = window.auth;
const provider = new GoogleAuthProvider();

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');

signupBtn.addEventListener('click', ()=>{
  createUserWithEmailAndPassword(auth,emailInput.value,passwordInput.value)
    .then(()=>{ window.location.href='lobby.html'; })
    .catch(err=>alert(err.message));
});

loginBtn.addEventListener('click', ()=>{
  signInWithEmailAndPassword(auth,emailInput.value,passwordInput.value)
    .then(()=>{ window.location.href='lobby.html'; })
    .catch(err=>alert(err.message));
});

googleBtn.addEventListener('click', ()=>{
  signInWithPopup(auth, provider)
    .then(()=>{ window.location.href='lobby.html'; })
    .catch(err=>alert(err.message));
});

// Redirect if already logged in
onAuthStateChanged(auth,user=>{
  if(user) window.location.href='lobby.html';
});
