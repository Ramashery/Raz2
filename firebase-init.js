// Импортируем функции из новой, модульной версии SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Ваши ключи для подключения к Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAT4dDEIDUtzP60ibjahO06P75Q6h95ZN4", // Используйте ваши реальные ключи
    authDomain: "razrabotka-b61bc.firebaseapp.com",
    projectId: "razrabotka-b61bc",
    storageBucket: "razrabotka-b61bc.firebasestorage.app",
    messagingSenderId: "394402564794",
    appId: "1:394402564794:web:f610ffb03e655c600c5083"
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);

// Создаем и экспортируем сервисы и функции для использования в других файлах
export const auth = getAuth(app);
export const db = getFirestore(app);

// Экспортируем функции, чтобы не импортировать их в каждом файле заново
export { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    setDoc
};
