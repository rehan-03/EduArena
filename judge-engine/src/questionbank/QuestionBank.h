#ifndef QUESTION_BANK_H
#define QUESTION_BANK_H

#include <string>
#include <unordered_map>

struct Question {
    std::string id;
    std::string questionText;
    std::string options[4];
    int correctIndex;
    std::string difficulty;
    std::string unitId;
};

class QuestionBank {
private:
    std::unordered_map<std::string, Question> bank;
    
public:
    void addQuestion(const Question& q) {
        bank[q.id] = q;
    }
    
    Question* getQuestion(const std::string& id) {
        auto it = bank.find(id);
        if (it != bank.end()) {
            return &it->second;
        }
        return nullptr;
    }
    
    bool removeQuestion(const std::string& id) {
        return bank.erase(id) > 0;
    }
    
    size_t size() const {
        return bank.size();
    }
    
    void clear() {
        bank.clear();
    }
};

#endif