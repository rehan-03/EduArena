#ifndef STRING_UTILS_H
#define STRING_UTILS_H

#include <string>
#include <algorithm>
#include <cctype>

class StringUtils {
public:
    static std::string trim(const std::string& str) {
        size_t start = 0;
        while (start < str.size() && std::isspace(str[start])) {
            start++;
        }
        
        size_t end = str.size();
        while (end > start && std::isspace(str[end - 1])) {
            end--;
        }
        
        return str.substr(start, end - start);
    }
    
    static bool exactCompare(const std::string& expected, const std::string& actual) {
        return trim(expected) == trim(actual);
    }
};

#endif