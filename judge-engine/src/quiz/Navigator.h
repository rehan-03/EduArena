#ifndef NAVIGATOR_H
#define NAVIGATOR_H

#include <stack>
#include <vector>

class Navigator {
private:
    std::stack<int> visitedStack;
    std::vector<int> questionOrder;
    int currentIndex;
    
public:
    Navigator() : currentIndex(0) {}
    
    void setQuestionOrder(const std::vector<int>& order) {
        questionOrder = order;
        currentIndex = 0;
    }
    
    void pushCurrent() {
        if (currentIndex < (int)questionOrder.size()) {
            visitedStack.push(currentIndex);
        }
    }
    
    bool canGoBack() const {
        return !visitedStack.empty();
    }
    
    int goBack() {
        if (!visitedStack.empty()) {
            currentIndex = visitedStack.top();
            visitedStack.pop();
        }
        return currentIndex;
    }
    
    int goForward() {
        if (currentIndex < (int)questionOrder.size() - 1) {
            currentIndex++;
        }
        return currentIndex;
    }
    
    int getCurrentIndex() const {
        return currentIndex;
    }
    
    int getCurrentQuestionId() const {
        if (currentIndex >= 0 && currentIndex < (int)questionOrder.size()) {
            return questionOrder[currentIndex];
        }
        return -1;
    }
    
    size_t totalQuestions() const {
        return questionOrder.size();
    }
    
    bool isLastQuestion() const {
        return currentIndex >= (int)questionOrder.size() - 1;
    }
};

#endif