import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

function listenRadioGameStatus() {
    const rtdb = window.firebaseConfig.getRTDB();
    if (!rtdb) return;

    const gameRef = ref(rtdb, 'radio/gameStatus');

    onValue(gameRef, (snapshot) => {
        const data = snapshot.val();

        if (!data) return;

        console.log("📡 Estado del juego actualizado:", data);

        window.radio.games.active = data.activeGame;
        window.radio.games.status = data.status;
        window.radio.games.config = data.config;

        if (data.status === 'waiting') {
            updateGameCardsForPlayers(data.activeGame, true);
            showRadioNotification(
                '🎮 Juego disponible',
                '¡Ya podés unirte al juego!',
                'success'
            );
        }

        if (data.status === 'finished') {
            updateGameCardsForPlayers(null, false);
        }
    });
}

window.listenRadioGameStatus = listenRadioGameStatus;
