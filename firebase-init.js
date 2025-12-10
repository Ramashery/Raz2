// Импортируем функции, которые нам понадобятся из SDK Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";


// <<< ВАЖНО: ЗАМЕНИТЕ ЭТОТ БЛОК ЦЕЛИКОМ НА ВАШИ КЛЮЧИ ИЗ КОНСОЛИ FIREBASE >>>
// --- НАЧАЛО БЛОКА ДЛЯ ЗАМЕНЫ ---
const firebaseConfig = {
  apiKey: "AIzaSy...СКОПИРУЙТЕ ВАШ КЛЮЧ ИЗ КОНСОЛИ FIREBASE...",
  authDomain: "razrabotka-b61bc.firebaseapp.com",
  projectId: "razrabotka-b61bc",
  storageBucket: "razrabotka-b61bc.appspot.com",
  messagingSenderId: "394402564794",
  appId: "1:394402564794:web:f610ffb03e655c600c5083"
};
// --- КОНЕЦ БЛОКА ДЛЯ ЗАМЕНЫ ---


// Инициализируем приложение Firebase с вашими ключами
const app = initializeApp(firebaseConfig);

// Создаем и экспортируем сервисы, чтобы их можно было использовать в других файлах вашего сайта
export const auth = getAuth(app);       // Сервис для аутентификации (входа пользователей)
export const db = getFirestore(app);    // Сервис для работы с базой данных Firestore
