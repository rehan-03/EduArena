#ifndef QUIZ_SESSION_H
#define QUIZ_SESSION_H

#include <queue>
#include <vector>
#include <string>
#include <unordered_set>
#include "Navigator.h"
#include "../questionbank/QuestionBank.h"

class QuizSession {
private:
    std::queue<int> questionQueue;
    Navigator navigator;
    std::unordered_set<std::string> attemptedQuestionIds;
    std::string sessionId;
    std::string studentId;
    std::string subjectId;
    long long startedAt;
    int currentScore;
    
public:
    QuizSession(const std::string& sid, const std::string& stuId, const std::string& subId)
        : sessionId(sid), studentId(stuId), subjectId(subId), startedAt(0), currentScore(0) {}
    
    void loadQuestions(const std::vector<int>& questionIds) {
        std::vector<int> shuffled = questionIds;
        
        std::srand(std::time(nullptr));
        for (int i = shuffled.size() - 1; i > 0; i--) {
            int j = std::rand() % (i + 1);
            std::swap(shuffled[i], shuffled[j]);
        }
        
        for (int id : shuffled) {
            questionQueue.push(id);
        }
        
        navigator.setQuestionOrder(shuffled);
    }
    
    int* getNextQuestion() {
        if (questionQueue.empty()) {
            return nullptr;
        }
        
        int qid = questionQueue.front();
        return &qid;
    }
    
    void markAttempted(const std::string& questionId) {
        attemptedQuestionIds.insert(questionId);
    }
    
    bool hasAttempted(const std::string& questionId) const {
        return attemptedQuestionIds.count(questionId) > 0;
    }
    
    bool isDuplicateQuestion(const std::string& questionId) const {
        return attemptedQuestionIds.count(questionId) > 0;
    }
    
    void updateScore(int points) {
        currentScore += points;
    }
    
    int getScore() const {
        return currentScore;
    }
    
    std::string getSessionId() const { return sessionId; }
    std::string getStudentId() const { return studentId; }
    std::string getSubjectId() const { return subjectId; }
    long long getStartedAt() const { return startedAt; }
    
    void setStartedAt(long long time) { startedAt = time; }
    
    Navigator& getNavigator() { return navigator; }
};

#endif