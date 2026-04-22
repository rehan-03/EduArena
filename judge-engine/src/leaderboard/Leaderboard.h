#ifndef LEADERBOARD_H
#define LEADERBOARD_H

#include <string>

struct LeaderboardNode {
    std::string studentId;
    std::string studentName;
    int totalScore;
    double timeTaken;
    LeaderboardNode* next;
    
    LeaderboardNode(const std::string& id, const std::string& name, int score, double time)
        : studentId(id), studentName(name), totalScore(score), timeTaken(time), next(nullptr) {}
};

class Leaderboard {
private:
    LeaderboardNode* head;
    
public:
    Leaderboard() : head(nullptr) {}
    
    void insert(const std::string& studentId, const std::string& studentName, int score, double timeTaken) {
        LeaderboardNode* newNode = new LeaderboardNode(studentId, studentName, score, timeTaken);
        
        if (!head || (head->totalScore < score) || 
            (head->totalScore == score && head->timeTaken > timeTaken)) {
            newNode->next = head;
            head = newNode;
            return;
        }
        
        LeaderboardNode* current = head;
        while (current->next && 
               (current->next->totalScore > score || 
                (current->next->totalScore == score && current->next->timeTaken <= timeTaken))) {
            current = current->next;
        }
        
        newNode->next = current->next;
        current->next = newNode;
    }
    
    void updateScore(const std::string& studentId, int newScore, double newTime) {
        remove(studentId);
        if (head) {
            insert(studentId, "", newScore, newTime);
        } else {
            insert(studentId, "", newScore, newTime);
        }
    }
    
    void remove(const std::string& studentId) {
        if (!head) return;
        
        if (head->studentId == studentId) {
            LeaderboardNode* temp = head;
            head = head->next;
            delete temp;
            return;
        }
        
        LeaderboardNode* current = head;
        while (current->next && current->next->studentId != studentId) {
            current = current->next;
        }
        
        if (current->next) {
            LeaderboardNode* temp = current->next;
            current->next = temp->next;
            delete temp;
        }
    }
    
    int getRank(const std::string& studentId) const {
        LeaderboardNode* current = head;
        int rank = 1;
        while (current) {
            if (current->studentId == studentId) {
                return rank;
            }
            rank++;
            current = current->next;
        }
        return -1;
    }
    
    LeaderboardNode* getTop(int count) const {
        return head;
    }
    
    void clear() {
        while (head) {
            LeaderboardNode* temp = head;
            head = head->next;
            delete temp;
        }
    }
    
    ~Leaderboard() {
        clear();
    }
};

#endif