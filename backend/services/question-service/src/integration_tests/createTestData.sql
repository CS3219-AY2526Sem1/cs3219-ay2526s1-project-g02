-- =====================================================
-- COMPLETE DATABASE SETUP FOR QUESTION SERVICE
-- Run all sections in Supabase SQL Editor
-- =====================================================

-- ============================================
-- SECTION 1: CREATE TABLES
-- ============================================

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT[] NOT NULL,
  examples TEXT,
  constraints TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggested solutions table
CREATE TABLE IF NOT EXISTS suggested_solutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  solution_code TEXT NOT NULL,
  explanation TEXT NOT NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'javascript',
  time_complexity VARCHAR(100),
  space_complexity VARCHAR(100),
  approach_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question selections table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS question_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  is_winner BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question attempts table
CREATE TABLE IF NOT EXISTS question_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  match_id UUID,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTION 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_cases_question_id ON test_cases(question_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_order ON test_cases(question_id, order_index);
CREATE INDEX IF NOT EXISTS idx_suggested_solutions_question_id ON suggested_solutions(question_id);
CREATE INDEX IF NOT EXISTS idx_suggested_solutions_language ON suggested_solutions(language);
CREATE UNIQUE INDEX IF NOT EXISTS question_selections_match_user_idx ON question_selections(match_id, user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts(question_id);

-- ============================================
-- SECTION 3: ENABLE RLS & CREATE POLICIES
-- ============================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggested_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;

-- Questions: public read, service role manage
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Service manage questions" ON questions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Test cases: public read, service role manage
CREATE POLICY "Public read test_cases" ON test_cases FOR SELECT USING (true);
CREATE POLICY "Service manage test_cases" ON test_cases FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Suggested solutions: public read, service role manage
CREATE POLICY "Public read solutions" ON suggested_solutions FOR SELECT USING (true);
CREATE POLICY "Service manage solutions" ON suggested_solutions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Question attempts: users see own, service role full access
CREATE POLICY "Users view own attempts" ON question_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service manage attempts" ON question_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- SECTION 4: CREATE TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suggested_solutions_updated_at BEFORE UPDATE ON suggested_solutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SECTION 5: INSERT SAMPLE QUESTIONS
-- ============================================

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

-- ============================================
-- SECTION 6: INSERT SUGGESTED SOLUTIONS
-- ============================================

-- Binary Search
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function binarySearch(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}', 'Binary search divides the search space in half repeatedly. Compare middle element with target and eliminate half the array each iteration.', 'javascript', 'O(log n)', 'O(1)', 'Iterative Binary Search'
FROM questions WHERE title = 'Binary Search' LIMIT 1;

-- Climbing Stairs
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function climbStairs(n) {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}', 'Dynamic programming like Fibonacci. Ways to reach step n = ways to reach (n-1) + ways to reach (n-2). Space optimized by tracking only last two values.', 'javascript', 'O(n)', 'O(1)', 'DP Space Optimized'
FROM questions WHERE title = 'Climbing Stairs' LIMIT 1;

-- Valid Parentheses
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function isValid(s) {
  const stack = [];
  const pairs = {"(": ")", "[": "]", "{": "}"};
  for (let char of s) {
    if (pairs[char]) stack.push(char);
    else if (pairs[stack.pop()] !== char) return false;
  }
  return stack.length === 0;
}', 'Use stack for opening brackets. Push openers, pop and match closers. Stack must be empty at end for valid string.', 'javascript', 'O(n)', 'O(n)', 'Stack Matching'
FROM questions WHERE title = 'Valid Parentheses' LIMIT 1;

-- Longest Substring
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function lengthOfLongestSubstring(s) {
  const seen = new Map();
  let maxLen = 0, start = 0;
  for (let end = 0; end < s.length; end++) {
    if (seen.has(s[end]) && seen.get(s[end]) >= start) {
      start = seen.get(s[end]) + 1;
    }
    seen.set(s[end], end);
    maxLen = Math.max(maxLen, end - start + 1);
  }
  return maxLen;
}', 'Sliding window with HashMap. Track last index of each character. When duplicate found in window, slide start pointer past previous occurrence.', 'javascript', 'O(n)', 'O(min(m,n))', 'Sliding Window'
FROM questions WHERE title = 'Longest Substring Without Repeating Characters' LIMIT 1;

-- Reverse Linked List
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function reverseList(head) {
  let prev = null, current = head;
  while (current) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }
  return prev;
}', 'Iteratively reverse pointers. Maintain three pointers: prev, current, next. For each node, reverse pointer to prev, then advance all pointers.', 'javascript', 'O(n)', 'O(1)', 'Iterative Reversal'
FROM questions WHERE title = 'Reverse Linked List' LIMIT 1;

-- FizzBuzz
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function fizzBuzz(n) {
  const result = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) result.push("FizzBuzz");
    else if (i % 3 === 0) result.push("Fizz");
    else if (i % 5 === 0) result.push("Buzz");
    else result.push(String(i));
  }
  return result;
}', 'Check divisibility by 15 first (both 3 and 5), then 3, then 5. Order matters!', 'javascript', 'O(n)', 'O(n)', 'Modulo Check'
FROM questions WHERE title = 'FizzBuzz' LIMIT 1;

-- Two Sum
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}', 'HashMap stores seen numbers and indices. For each number, check if its complement (target - number) exists in map. O(n) instead of O(n²) nested loops.', 'javascript', 'O(n)', 'O(n)', 'HashMap Lookup'
FROM questions WHERE title = 'Two Sum' LIMIT 1;

-- Valid Palindrome
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function isPalindrome(s) {
  const cleaned = s.replace(/[^a-z0-9]/gi, "").toLowerCase();
  let left = 0, right = cleaned.length - 1;
  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false;
    left++;
    right--;
  }
  return true;
}', 'Clean string (remove non-alphanumeric, lowercase). Use two pointers from both ends moving inward, comparing characters.', 'javascript', 'O(n)', 'O(n)', 'Two Pointer'
FROM questions WHERE title = 'Valid Palindrome' LIMIT 1;

-- Maximum Subarray
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function maxSubArray(nums) {
  let maxSum = nums[0], currentSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}', 'Kadane''s Algorithm: At each position, either extend current subarray or start fresh. Track maximum sum seen. Handles negatives elegantly in single pass.', 'javascript', 'O(n)', 'O(1)', 'Kadane''s Algorithm'
FROM questions WHERE title = 'Maximum Subarray' LIMIT 1;

-- Merge Two Sorted Lists
INSERT INTO suggested_solutions (question_id, solution_code, explanation, language, time_complexity, space_complexity, approach_name)
SELECT id, 'function mergeTwoLists(l1, l2) {
  const dummy = {val: 0, next: null};
  let current = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      current.next = l1;
      l1 = l1.next;
    } else {
      current.next = l2;
      l2 = l2.next;
    }
    current = current.next;
  }
  current.next = l1 || l2;
  return dummy.next;
}', 'Dummy node simplifies edge cases. Compare heads, attach smaller one, advance that pointer. When one exhausted, attach remainder. Already sorted.', 'javascript', 'O(n+m)', 'O(1)', 'Two-Pointer Merge'
FROM questions WHERE title = 'Merge Two Sorted Lists' LIMIT 1;

RAISE NOTICE 'Successfully created tables, 10 questions, test cases, and solutions!';

END $$;

-- ============================================
-- SECTION 7: VERIFY SETUP
-- ============================================

SELECT 
  (SELECT COUNT(*) FROM questions) as total_questions,
  (SELECT COUNT(*) FROM test_cases) as total_test_cases,
  (SELECT COUNT(*) FROM suggested_solutions) as total_solutions;

-- View complete setup
SELECT 
  q.title,
  q.difficulty,
  COUNT(DISTINCT tc.id) as test_cases,
  COUNT(DISTINCT ss.id) as solutions
FROM questions q
LEFT JOIN test_cases tc ON q.id = tc.question_id
LEFT JOIN suggested_solutions ss ON q.id = ss.question_id
GROUP BY q.id, q.title, q.difficulty
ORDER BY q.difficulty, q.title;