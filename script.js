const board = document.getElementById('chessboard');
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
let turn = 'white';

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
      square.addEventListener('click', () => onSquareClick(row, col));
      board.appendChild(square);
    }
  }
}

function onSquareClick(row, col) {
  const piece = startPosition[row][col];
  if (selected) {
    // try to move
    if (isLegalMove(selected.row, selected.col, row, col)) {
      startPosition[row][col] = startPosition[selected.row][selected.col];
      startPosition[selected.row][selected.col] = '';
      turn = turn === 'white' ? 'black' : 'white';
    }
    selected = null;
    createBoard();
  } else {
    if (piece && isPlayersTurn(piece)) {
      selected = {row, col};
    }
  }
}

function isPlayersTurn(piece) {
  return (turn === 'white' && piece === piece.toUpperCase()) ||
         (turn === 'black' && piece === piece.toLowerCase());
}

function isLegalMove(r1, c1, r2, c2) {
  const piece = startPosition[r1][c1];
  const target = startPosition[r2][c2];
  
  // prevent capturing own piece
  if (target && ((piece === piece.toUpperCase() && target === target.toUpperCase()) ||
                 (piece === piece.toLowerCase() && target === target.toLowerCase()))) {
    return false;
  }
  
  const dr = r2 - r1;
  const dc = c2 - c1;
  
  switch(piece.toLowerCase()) {
    case 'p': // pawn
      if (piece === 'P') { // white
        if (dc === 0 && dr === -1 && !target) return true;
        if (dc === 0 && dr === -2 && r1 === 6 && !target && !startPosition[r1-1][c1]) return true;
        if (Math.abs(dc) === 1 && dr === -1 && target && target === target.toLowerCase()) return true;
      } else { // black
        if (dc === 0 && dr === 1 && !target) return true;
        if (dc === 0 && dr === 2 && r1 === 1 && !target && !startPosition[r1+1][c1]) return true;
        if (Math.abs(dc) === 1 && dr === 1 && target && target === target.toUpperCase()) return true;
      }
      return false;
    case 'r': // rook
      if (dr === 0 || dc === 0) return isPathClear(r1, c1, r2, c2);
      return false;
    case 'n': // knight
      return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
    case 'b': // bishop
      if (Math.abs(dr) === Math.abs(dc)) return isPathClear(r1, c1, r2, c2);
      return false;
    case 'q': // queen
      if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) return isPathClear(r1, c1, r2, c2);
      return false;
    case 'k': // king
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
    default:
      return false;
  }
}

function isPathClear(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  let r = r1 + dr;
  let c = c1 + dc;
  while (r !== r2 || c !== c2) {
    if (startPosition[r][c] !== '') return false;
    r += dr;
    c += dc;
  }
  return true;
}

createBoard();
