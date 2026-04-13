import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cấu hình của bạn
const firebaseConfig = {
    apiKey: "AIzaSyArNbHgqEou5SOt9AjNPkP2aLmSUTqkTik",
    authDomain: "dulish-db.firebaseapp.com",
    projectId: "dulish-db",
    storageBucket: "dulish-db.firebasestorage.app",
    messagingSenderId: "510130583777",
    appId: "1:510130583777:web:24d0472a619543d1f65fa0",
    measurementId: "G-7PTHCRRNF8"
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// Xuất các instance dịch vụ để dùng ở khắp mọi nơi trong extension
export const auth = getAuth(app);
export const db = getFirestore(app);

// Xuất các helper cần thiết cho luồng đăng nhập
export { GoogleAuthProvider, signInWithCredential };