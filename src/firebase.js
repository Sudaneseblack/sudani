import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJMWB4_aK1s0tkNMqG5Jmza2UTl7DMzlI",
  authDomain: "sudani-b052d.firebaseapp.com",
  projectId: "sudani-b052d",
  storageBucket: "sudani-b052d.firebasestorage.app",
  appId: "1:1035591661594:web:2c3ac031b7b9dcc00db9a3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
