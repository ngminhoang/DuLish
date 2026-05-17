import type { VocabularyObject } from './srsEngine';

// Seed timestamps relative to current time to mock distinct SRS states
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const oneHourHence = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const twoHoursHence = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
const nowStr = new Date().toISOString();

export const mockVocabularies: VocabularyObject[] = [
  {
    word_id: "run_1715971100",
    raw_text: "running",
    lemma: "run",
    vietnamese_meaning: "chạy, vận hành",
    type: "word",
    current_streak: 2,
    next_review_time: oneHourAgo, // Past next review time -> Ready to review (bright highlight)
    status: "ready_to_review",
    last_updated: nowStr
  },
  {
    word_id: "study_1715971200",
    raw_text: "studies",
    lemma: "study",
    vietnamese_meaning: "học tập, nghiên cứu",
    type: "word",
    current_streak: 1,
    next_review_time: oneHourHence, // Future next review time -> Cooling (faint highlight)
    status: "cooling",
    last_updated: nowStr
  },
  {
    word_id: "car_1715971300",
    raw_text: "cars",
    lemma: "car",
    vietnamese_meaning: "xe hơi, ô tô",
    type: "word",
    current_streak: 0,
    next_review_time: nowStr, // Exactly now -> Ready to review (bright highlight)
    status: "ready_to_review",
    last_updated: nowStr
  },
  {
    word_id: "box_1715971400",
    raw_text: "boxes",
    lemma: "box",
    vietnamese_meaning: "chiếc hộp, quyền anh",
    type: "word",
    current_streak: 5,
    next_review_time: twoHoursHence, // Future next review time -> Cooling (faint highlight)
    status: "cooling",
    last_updated: nowStr
  },
  {
    word_id: "amazing_1715971500",
    raw_text: "amazing",
    lemma: "amazing",
    vietnamese_meaning: "kinh ngạc, tuyệt vời",
    type: "word",
    current_streak: 10,
    next_review_time: oneHourAgo, // Past next review time -> Ready to review (bright highlight)
    status: "ready_to_review",
    last_updated: nowStr
  }
];
