import { db } from './firebase';
import {
    doc,
    setDoc,
    serverTimestamp,
    collection,
    getDocs,
    query,
    where
} from "firebase/firestore";

export const VocabularyService = {
    // 1. Lưu từ vựng mới (hoặc cập nhật nếu đã tồn tại)
    async saveWord(uid: string, word: string) {
        const wordId = word.toLowerCase().trim();
        // Đường dẫn: users/{uid}/vocabularies/{wordId}
        const docRef = doc(db, "users", uid, "vocabularies", wordId);

        const data = {
            word: word,
            status: 1, // 1: đang học, 0: đã thuộc/ẩn
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp() // Firestore sẽ thông minh không ghi đè nếu đã có
        };

        return await setDoc(docRef, data, { merge: true });
    },

    // 2. Lấy danh sách từ vựng để "con sâu" hiển thị
    async getActiveWords(uid: string) {
        const vocabRef = collection(db, "users", uid, "vocabularies");
        const q = query(vocabRef, where("status", "==", 1));

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }
};