import {
  ref,
  set,
  update,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const db = window.firebaseRTDB;
const gameRef = ref(db, "radioGame");

// ===============================
// ESCUCHAR ESTADO DEL JUEGO (TODOS)
// ===============================
onValue(gameRef, (snapshot) => {
  const game = snapshot.val();

  window.radio.games.status = game.status;

  if (game.status === "waiting") {
    mostrarBotonUnirse();
  }

  if (!game) {
    ocultarTodo();
    return;
  }

  console.log("🎮 Juego actualizado:", game);

  if (game.status === "waiting") {
    mostrarBotonUnirse();
  }

  if (game.status === "active") {
    mostrarJuego(game.currentQuestion);
  }

  if (game.status === "finished") {
    mostrarResultados(game.players);
  }
});

// ===============================
// FUNCIONES ADMIN
// ===============================
window.adminStartGame = function () {
  set(gameRef, {
    status: "waiting",
    currentQuestion: 0,
    players: {}
  });
};

window.adminStartGameNow = function () {
  update(gameRef, {
    status: "active"
  });
};

window.adminFinishGame = function () {
  update(gameRef, {
    status: "finished"
  });
};

// ===============================
// FUNCIONES OYENTE
// ===============================
window.joinGame = function (uid, name) {
  const playerRef = ref(db, `radioGame/players/${uid}`);

  update(playerRef, {
    name: name,
    points: 0
  });
};

// ===============================
// UI BÁSICA
// ===============================
window.mostrarBotonUnirse = function () {
  document.getElementById("joinGameBtn").style.display = "block";
};

window.ocultarTodo = function () {
  document.getElementById("joinGameBtn").style.display = "none";
};

window.mostrarJuego = function () {
  console.log("▶ Juego en curso");
};

window.mostrarResultados = function (players) {
  console.log("🏁 Resultados:", players);
};
