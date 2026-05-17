import { db } from './firebase';
import {
    doc,
    setDoc,
    serverTimestamp,
    collection,
    getDocs
} from "firebase/firestore";
import { ensureSchema, type VocabularyObject } from './srsEngine';

export const VocabularyService = {
    // 1. Lưu từ vựng mới (hoặc cập nhật/mở rộng nếu đã tồn tại)
    async saveWord(uid: string, vocabObj: any) {
        const wordId = vocabObj.word_id;
        // Đường dẫn: users/{uid}/vocabularies/{wordId}
        const docRef = doc(db, "users", uid, "vocabularies", wordId);

        // Chuẩn bị dữ liệu cập nhật, bổ sung timestamp của Firestore
        // merge: true đảm bảo mở rộng bản ghi thay vì thiết lập lại mọi trường dữ liệu
        const data = {
            ...vocabObj,
            updatedAt: serverTimestamp(),
        };

        return await setDoc(docRef, data, { merge: true });
    },

    // 2. Lấy toàn bộ danh sách từ vựng, tự động nâng cấp và mở rộng schema của từ cũ
    async getActiveWords(uid: string): Promise<VocabularyObject[]> {
        const vocabRef = collection(db, "users", uid, "vocabularies");
        const querySnapshot = await getDocs(vocabRef);

        return querySnapshot.docs.map(docSnapshot => {
            const data = docSnapshot.data();
            // Đảm bảo và mở rộng schema cũ một cách an toàn
            return ensureSchema({
                id: docSnapshot.id,
                ...data
            });
        });
    }
};