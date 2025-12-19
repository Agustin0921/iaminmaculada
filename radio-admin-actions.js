// radio-admin-actions.js
import {
  ref,
  set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export async function adminStartGame(gameType) {
    const rtdb = window.firebaseConfig.getRTDB();
    if (!rtdb) return;

    await set(ref(rtdb, 'radio/gameStatus'), {
        activeGame: gameType,
        status: 'waiting',
        createdAt: new Date().toISOString()
    });

    console.log("✅ Juego iniciado:", gameType);
}

export async function adminFinishGame() {
    const rtdb = window.firebaseConfig.getRTDB();
    if (!rtdb) return;

    await set(ref(rtdb, 'radio/gameStatus'), {
        status: 'finished',
        finishedAt: new Date().toISOString()
    });

    console.log("🏁 Juego finalizado");
}
