#ifndef OUTPUT_MATCHER_H
#define OUTPUT_MATCHER_H

#include <string>
#include <vector>
#include "StringUtils.h"

class OutputMatcher {
public:
    struct MatchResult {
        bool matched;
        std::string expected;
        std::string actual;
        std::string message;
        
        MatchResult(bool m, const std::string& e, const std::string& a)
            : matched(m), expected(e), actual(a) {
            message = matched ? "Accepted" : "Wrong Answer";
        }
    };
    
    static MatchResult match(const std::string& expected, const std::string& actual) {
        bool isMatch = StringUtils::exactCompare(expected, actual);
        return MatchResult(isMatch, expected, actual);
    }
    
    static std::vector<MatchResult> matchAll(
        const std::vector<std::string>& expectedOutputs,
        const std::vector<std::string>& actualOutputs) {
        
        std::vector<MatchResult> results;
        size_t count = std::min(expectedOutputs.size(), actualOutputs.size());
        
        for (size_t i = 0; i < count; i++) {
            results.push_back(match(expectedOutputs[i], actualOutputs[i]));
        }
        
        return results;
    }
};

#endif