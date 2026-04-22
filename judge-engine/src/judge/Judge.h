#ifndef JUDGE_H
#define JUDGE_H

#include <string>
#include <vector>
#include <fstream>
#include <cstdlib>
#include <iostream>
#include "OutputMatcher.h"
#include "../utils/CodeValidator.h"

class Judge {
public:
    enum Verdict {
        ACCEPTED,
        WRONG_ANSWER,
        TIME_LIMIT_EXCEEDED,
        RUNTIME_ERROR,
        COMPILATION_ERROR
    };
    
    struct TestResult {
        bool passed;
        Verdict verdict;
        std::string output;
        std::string error;
    };
    
    static Verdict judge(
        const std::string& code,
        const std::string& language,
        const std::vector<std::pair<std::string, std::string> >& testCases) {
        
        if (CodeValidator::containsBannedKeywords(code)) {
            return RUNTIME_ERROR;
        }
        
        if (!CodeValidator::validateBrackets(code)) {
            return COMPILATION_ERROR;
        }
        
        for (const auto& tc : testCases) {
            TestResult result = runSingleTest(code, language, tc.first, tc.second);
            if (!result.passed) {
                return result.verdict;
            }
        }
        
        return ACCEPTED;
    }
    
private:
    static TestResult runSingleTest(
        const std::string& code,
        const std::string& language,
        const std::string& input,
        const std::string& expectedOutput) {
        
        std::string tempFile = "temp_solution." + getExtension(language);
        std::string inputFile = "temp_input.txt";
        std::string outputFile = "temp_output.txt";
        std::string errorFile = "temp_error.txt";
        
        std::ofstream out(tempFile.c_str());
        out << code;
        out.close();
        
        std::ofstream inFile(inputFile.c_str());
        inFile << input;
        inFile.close();
        
        std::string compileCmd = getCompileCommand(language, tempFile);
        std::string runCmd = getRunCommand(language, tempFile, inputFile, outputFile);
        
        int compileResult = system(compileCmd.c_str());
        if (compileResult != 0) {
            return {false, COMPILATION_ERROR, "", "Compilation failed"};
        }
        
        int runResult = system(runCmd.c_str());
        
        if (runResult != 0) {
            return {false, RUNTIME_ERROR, "", "Runtime error"};
        }
        
        std::ifstream outputFileStream(outputFile.c_str());
        std::string actualOutput((std::istreambuf_iterator<char>(outputFileStream)),
                                  std::istreambuf_iterator<char>());
        outputFileStream.close();
        
        auto result = OutputMatcher::match(expectedOutput, actualOutput);
        
        return {result.matched, 
                result.matched ? ACCEPTED : WRONG_ANSWER, 
                actualOutput, 
                result.message};
    }
    
    static std::string getExtension(const std::string& language) {
        if (language == "cpp") return "cpp";
        if (language == "python") return "py";
        if (language == "java") return "java";
        return "txt";
    }
    
    static std::string getCompileCommand(const std::string& language, const std::string& file) {
        if (language == "cpp") {
            return "g++ " + file + " -o temp_solution 2>";
        }
        return "";
    }
    
    static std::string getRunCommand(const std::string& language, 
                                    const std::string& file,
                                    const std::string& input,
                                    const std::string& output) {
        if (language == "cpp") {
            return "temp_solution < " + input + " > " + output + " 2>";
        }
        if (language == "python") {
            return "python " + file + " < " + input + " > " + output + " 2>";
        }
        return "";
    }
};

#endif