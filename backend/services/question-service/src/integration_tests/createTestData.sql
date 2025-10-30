-- SETUP SCRIPT: Create Test Data for Question Service
-- Run this in your Supabase SQL Editor after creating the tables

-- ============================================
-- STEP 1: Insert Sample Questions
-- ============================================

-- Store the question IDs for later use in test cases
DO $$
DECLARE
  two_sum_id UUID;
  valid_parens_id UUID;
  reverse_list_id UUID;
  max_subarray_id UUID;
  climbing_stairs_id UUID;
  merge_lists_id UUID;
  binary_search_id UUID;
  fizzbuzz_id UUID;
  palindrome_id UUID;
  longest_substring_id UUID;
BEGIN

-- 1. Two Sum (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Two Sum',
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
  'Easy',
  ARRAY['Array', 'Hash Table'],
  E'Example 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n\nExample 2:\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n\nExample 3:\nInput: nums = [3,3], target = 6\nOutput: [0,1]',
  E'2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.'
) RETURNING id INTO two_sum_id;

-- 2. Valid Parentheses (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Valid Parentheses',
  'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order. Every close bracket has a corresponding open bracket of the same type.',
  'Easy',
  ARRAY['String', 'Stack'],
  E'Example 1:\nInput: s = "()"\nOutput: true\n\nExample 2:\nInput: s = "()[]{}"\nOutput: true\n\nExample 3:\nInput: s = "(]"\nOutput: false',
  E'1 <= s.length <= 10^4\ns consists of parentheses only ''()[]{}''.'
) RETURNING id INTO valid_parens_id;

-- 3. Reverse Linked List (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Reverse Linked List',
  'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  'Easy',
  ARRAY['Linked List', 'Recursion'],
  E'Example 1:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n\nExample 2:\nInput: head = [1,2]\nOutput: [2,1]\n\nExample 3:\nInput: head = []\nOutput: []',
  E'The number of nodes in the list is the range [0, 5000].\n-5000 <= Node.val <= 5000'
) RETURNING id INTO reverse_list_id;

-- 4. Maximum Subarray (Medium)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Maximum Subarray',
  'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
  'Medium',
  ARRAY['Array', 'Dynamic Programming', 'Divide and Conquer'],
  E'Example 1:\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.\n\nExample 2:\nInput: nums = [1]\nOutput: 1\n\nExample 3:\nInput: nums = [5,4,-1,7,8]\nOutput: 23',
  E'1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4'
) RETURNING id INTO max_subarray_id;

-- 5. Climbing Stairs (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Climbing Stairs',
  'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
  'Easy',
  ARRAY['Dynamic Programming', 'Math', 'Memoization'],
  E'Example 1:\nInput: n = 2\nOutput: 2\nExplanation: There are two ways to climb to the top.\n1. 1 step + 1 step\n2. 2 steps\n\nExample 2:\nInput: n = 3\nOutput: 3\nExplanation: There are three ways to climb to the top.\n1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step',
  E'1 <= n <= 45'
) RETURNING id INTO climbing_stairs_id;

-- 6. Merge Two Sorted Lists (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Merge Two Sorted Lists',
  'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.',
  'Easy',
  ARRAY['Linked List', 'Recursion'],
  E'Example 1:\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n\nExample 2:\nInput: list1 = [], list2 = []\nOutput: []\n\nExample 3:\nInput: list1 = [], list2 = [0]\nOutput: [0]',
  E'The number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100\nBoth list1 and list2 are sorted in non-decreasing order.'
) RETURNING id INTO merge_lists_id;

-- 7. Binary Search (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Binary Search',
  'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.',
  'Easy',
  ARRAY['Array', 'Binary Search'],
  E'Example 1:\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\nExplanation: 9 exists in nums and its index is 4\n\nExample 2:\nInput: nums = [-1,0,3,5,9,12], target = 2\nOutput: -1\nExplanation: 2 does not exist in nums so return -1',
  E'1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.'
) RETURNING id INTO binary_search_id;

-- 8. FizzBuzz (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'FizzBuzz',
  'Given an integer n, return a string array answer (1-indexed) where: answer[i] == "FizzBuzz" if i is divisible by 3 and 5. answer[i] == "Fizz" if i is divisible by 3. answer[i] == "Buzz" if i is divisible by 5. answer[i] == i (as a string) if none of the above conditions are true.',
  'Easy',
  ARRAY['Math', 'String', 'Simulation'],
  E'Example 1:\nInput: n = 3\nOutput: ["1","2","Fizz"]\n\nExample 2:\nInput: n = 5\nOutput: ["1","2","Fizz","4","Buzz"]\n\nExample 3:\nInput: n = 15\nOutput: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]',
  E'1 <= n <= 10^4'
) RETURNING id INTO fizzbuzz_id;

-- 9. Valid Palindrome (Easy)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Valid Palindrome',
  'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers. Given a string s, return true if it is a palindrome, or false otherwise.',
  'Easy',
  ARRAY['String', 'Two Pointers'],
  E'Example 1:\nInput: s = "A man, a plan, a canal: Panama"\nOutput: true\nExplanation: "amanaplanacanalpanama" is a palindrome.\n\nExample 2:\nInput: s = "race a car"\nOutput: false\nExplanation: "raceacar" is not a palindrome.\n\nExample 3:\nInput: s = " "\nOutput: true\nExplanation: s is an empty string "" after removing non-alphanumeric characters.',
  E'1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.'
) RETURNING id INTO palindrome_id;

-- 10. Longest Substring Without Repeating Characters (Medium)
INSERT INTO questions (title, description, difficulty, category, examples, constraints)
VALUES (
  'Longest Substring Without Repeating Characters',
  'Given a string s, find the length of the longest substring without repeating characters.',
  'Medium',
  ARRAY['String', 'Hash Table', 'Sliding Window'],
  E'Example 1:\nInput: s = "abcabcbb"\nOutput: 3\nExplanation: The answer is "abc", with the length of 3.\n\nExample 2:\nInput: s = "bbbbb"\nOutput: 1\nExplanation: The answer is "b", with the length of 1.\n\nExample 3:\nInput: s = "pwwkew"\nOutput: 3\nExplanation: The answer is "wke", with the length of 3.',
  E'0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.'
) RETURNING id INTO longest_substring_id;

-- ============================================
-- STEP 2: Insert Test Cases
-- ============================================

-- Test cases for Two Sum
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(two_sum_id, '{"nums": [2, 7, 11, 15], "target": 9}', '{"result": [0, 1]}', 1),
(two_sum_id, '{"nums": [3, 2, 4], "target": 6}', '{"result": [1, 2]}', 2),
(two_sum_id, '{"nums": [3, 3], "target": 6}', '{"result": [0, 1]}', 3);

-- Test cases for Valid Parentheses
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(valid_parens_id, '{"s": "()"}', '{"result": true}', 1),
(valid_parens_id, '{"s": "()[]{}"}', '{"result": true}', 2),
(valid_parens_id, '{"s": "(]"}', '{"result": false}', 3),
(valid_parens_id, '{"s": "([)]"}', '{"result": false}', 4);

-- Test cases for Reverse Linked List
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(reverse_list_id, '{"head": [1, 2, 3, 4, 5]}', '{"result": [5, 4, 3, 2, 1]}', 1),
(reverse_list_id, '{"head": [1, 2]}', '{"result": [2, 1]}', 2),
(reverse_list_id, '{"head": []}', '{"result": []}', 3);

-- Test cases for Maximum Subarray
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(max_subarray_id, '{"nums": [-2, 1, -3, 4, -1, 2, 1, -5, 4]}', '{"result": 6}', 1),
(max_subarray_id, '{"nums": [1]}', '{"result": 1}', 2),
(max_subarray_id, '{"nums": [5, 4, -1, 7, 8]}', '{"result": 23}', 3);

-- Test cases for Climbing Stairs
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(climbing_stairs_id, '{"n": 2}', '{"result": 2}', 1),
(climbing_stairs_id, '{"n": 3}', '{"result": 3}', 2),
(climbing_stairs_id, '{"n": 5}', '{"result": 8}', 3);

-- Test cases for Merge Two Sorted Lists
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(merge_lists_id, '{"list1": [1, 2, 4], "list2": [1, 3, 4]}', '{"result": [1, 1, 2, 3, 4, 4]}', 1),
(merge_lists_id, '{"list1": [], "list2": []}', '{"result": []}', 2),
(merge_lists_id, '{"list1": [], "list2": [0]}', '{"result": [0]}', 3);

-- Test cases for Binary Search
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(binary_search_id, '{"nums": [-1, 0, 3, 5, 9, 12], "target": 9}', '{"result": 4}', 1),
(binary_search_id, '{"nums": [-1, 0, 3, 5, 9, 12], "target": 2}', '{"result": -1}', 2);

-- Test cases for FizzBuzz
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(fizzbuzz_id, '{"n": 3}', '{"result": ["1", "2", "Fizz"]}', 1),
(fizzbuzz_id, '{"n": 5}', '{"result": ["1", "2", "Fizz", "4", "Buzz"]}', 2),
(fizzbuzz_id, '{"n": 15}', '{"result": ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]}', 3);

-- Test cases for Valid Palindrome
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(palindrome_id, '{"s": "A man, a plan, a canal: Panama"}', '{"result": true}', 1),
(palindrome_id, '{"s": "race a car"}', '{"result": false}', 2),
(palindrome_id, '{"s": " "}', '{"result": true}', 3);

-- Test cases for Longest Substring
INSERT INTO test_cases (question_id, input, expected_output, order_index) VALUES
(longest_substring_id, '{"s": "abcabcbb"}', '{"result": 3}', 1),
(longest_substring_id, '{"s": "bbbbb"}', '{"result": 1}', 2),
(longest_substring_id, '{"s": "pwwkew"}', '{"result": 3}', 3);

RAISE NOTICE 'Successfully created 10 questions with test cases!';

END $$;

-- ============================================
-- STEP 3: Verify the data
-- ============================================

-- Check questions count
SELECT COUNT(*) as total_questions FROM questions;

-- Check test cases count
SELECT COUNT(*) as total_test_cases FROM test_cases;

-- View questions with test case counts
SELECT 
  q.title,
  q.difficulty,
  q.category,
  COUNT(tc.id) as test_case_count
FROM questions q
LEFT JOIN test_cases tc ON q.id = tc.question_id
GROUP BY q.id, q.title, q.difficulty, q.category
ORDER BY q.difficulty, q.title;