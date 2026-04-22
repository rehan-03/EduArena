#ifndef CODE_VALIDATOR_H
#define CODE_VALIDATOR_H

#include <string>
#include <stack>
#include <unordered_set>

class CodeValidator {
private:
    static bool isMatchingPair(char open, char close) {
        return (open == '(' && close == ')') ||
               (open == '[' && close == ']') ||
               (open == '{' && close == '}');
    }
    
public:
    static bool validateBrackets(const std::string& code) {
        std::stack<char> bracketStack;
        
        for (char c : code) {
            if (c == '(' || c == '[' || c == '{') {
                bracketStack.push(c);
            } else if (c == ')' || c == ']' || c == '}') {
                if (bracketStack.empty() || !isMatchingPair(bracketStack.top(), c)) {
                    return false;
                }
                bracketStack.pop();
            }
        }
        
        return bracketStack.empty();
    }
    
    static bool containsBannedKeywords(const std::string& code) {
        std::unordered_set<std::string> banned = {
            "system(", "fork(", "exec", "popen"
        };
        
        for (const auto& keyword : banned) {
            if (code.find(keyword) != std::string::npos) {
                return true;
            }
        }
        
        return false;
    }
};

#endif