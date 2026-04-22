#ifndef DUPLICATE_DETECTOR_H
#define DUPLICATE_DETECTOR_H

#include <string>
#include <unordered_set>
#include <functional>

class DuplicateDetector {
private:
    std::unordered_set<size_t> seenHashes;
    
public:
    size_t hashQuestion(const std::string& questionText) {
        return std::hash<std::string>{}(questionText);
    }
    
    bool isDuplicate(const std::string& questionText) {
        size_t h = hashQuestion(questionText);
        return seenHashes.count(h) > 0;
    }
    
    void markAsSeen(const std::string& questionText) {
        size_t h = hashQuestion(questionText);
        seenHashes.insert(h);
    }
    
    void clear() {
        seenHashes.clear();
    }
};

#endif