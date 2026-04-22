#ifndef SUBMISSION_QUEUE_H
#define SUBMISSION_QUEUE_H

#include <queue>
#include <string>

struct Submission {
    std::string id;
    std::string studentId;
    std::string problemId;
    std::string code;
    std::string language;
    long long submittedAt;
};

class SubmissionQueue {
private:
    std::queue<Submission> queue;
    
public:
    void enqueue(const Submission& s) {
        queue.push(s);
    }
    
    Submission* next() {
        if (queue.empty()) {
            return nullptr;
        }
        return &queue.front();
    }
    
    void dequeue() {
        if (!queue.empty()) {
            queue.pop();
        }
    }
    
    bool empty() const {
        return queue.empty();
    }
    
    size_t size() const {
        return queue.size();
    }
};

#endif