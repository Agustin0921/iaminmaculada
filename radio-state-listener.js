// radio-state-listener.js
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export function startRadioStateListener() {
    const rtdb = window.firebaseConfig.getRTDB();

    if (!rtdb) {
        console.error("❌ RTDB no disponible");
        return;
    }

    const gameRef = ref(rtdb, 'radio/gameStatus');

    onValue(gameRef, (snapshot) => {
        const data = snapshot.val();

        console.log("📡 Estado radio recibido:", data);

        if (!data) {
            disableAllGamesUI();
            return;
        }

        // 🔥 Firebase manda, la UI obedece
        if (data.status === 'waiting') {
            enableGameUI(data.activeGame);
        }

        if (data.status === 'finished') {
            disableAllGamesUI();
        }
    });
}
