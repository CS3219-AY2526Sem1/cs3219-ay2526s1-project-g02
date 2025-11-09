# Question Service Test Queries

This document contains GraphQL queries to test the Question Service functionality.
Run these in the GraphQL Playground at `http://localhost:4002/graphql`

## Prerequisites

1. Start the Question Service from the root folder: `npm run dev:question`
2. Ensure database tables are created (see `database-schema.md`)
3. Populate with test data (see `setup.md`)
4. Open GraphQL Playground: `http://localhost:4002/graphql`

---

## Test 1: Get All Questions

**Purpose**: Verify that questions can be retrieved from the database

**Expected**: Returns an array of all questions

```graphql
query GetAllQuestions {
  questions {
    id
    title
    difficulty
    category
    createdAt
  }
}
```

**Success Criteria**:
- ✅ Returns array of questions
- ✅ Each question has id, title, difficulty, category
- ✅ Questions are ordered by created_at (newest first)

---

## Test 2: Get Single Question by ID

**Purpose**: Verify that a specific question can be retrieved

**Expected**: Returns the question with full details

```graphql
query GetQuestionById {
  question(id: "REPLACE_WITH_ACTUAL_QUESTION_ID") {
    id
    title
    description
    difficulty
    category
    examples
    constraints
  }
}
```

**Success Criteria**:
- ✅ Returns the correct question
- ✅ All fields are populated
- ✅ Returns null if ID doesn't exist

---

## Test 3: Filter by Difficulty

**Purpose**: Verify difficulty filtering works

**Expected**: Returns only Easy questions

```graphql
query GetEasyQuestions {
  questionsByDifficulty(difficulty: "Easy") {
    id
    title
    difficulty
  }
}
```

**Test variations**:
```graphql
# Medium questions
query GetMediumQuestions {
  questionsByDifficulty(difficulty: "Medium") {
    id
    title
    difficulty
  }
}

# Hard questions
query GetHardQuestions {
  questionsByDifficulty(difficulty: "Hard") {
    id
    title
    difficulty
  }
}
```

**Success Criteria**:
- ✅ All returned questions have the specified difficulty
- ✅ No questions with other difficulties are returned

---

## Test 4: Filter by Category

**Purpose**: Verify category filtering works

**Expected**: Returns questions that contain "Array" in their categories

```graphql
query GetArrayQuestions {
  questionsByCategory(category: "Array") {
    id
    title
    category
  }
}
```

**Test variations**:
```graphql
# Dynamic Programming questions
query GetDPQuestions {
  questionsByCategory(category: "Dynamic Programming") {
    id
    title
    category
  }
}

# String questions
query GetStringQuestions {
  questionsByCategory(category: "String") {
    id
    title
    category
  }
}
```

**Success Criteria**:
- ✅ All returned questions contain the specified category
- ✅ Questions may have multiple categories

---

## Test 5: Allocate Questions for Session (FR17)

**Purpose**: Verify random question allocation with filters

### Test 5a: No filters

```graphql
query AllocateRandomQuestions {
  allocateQuestionsForSession(count: 3) {
    id
    title
    difficulty
    category
  }
}
```

**Success Criteria**:
- ✅ Returns up to 3 random questions
- ✅ Questions are different each time (run multiple times)

### Test 5b: With difficulty filter

```graphql
query AllocateEasyQuestions {
  allocateQuestionsForSession(count: 2, difficulty: "Easy") {
    id
    title
    difficulty
    category
  }
}
```

**Success Criteria**:
- ✅ Returns up to 2 questions
- ✅ All questions have "Easy" difficulty

### Test 5c: With category filter

```graphql
query AllocateArrayQuestions {
  allocateQuestionsForSession(count: 3, categories: ["Array", "Hash Table"]) {
    id
    title
    difficulty
    category
  }
}
```

**Success Criteria**:
- ✅ Returns up to 3 questions
- ✅ All questions contain at least one of the specified categories

### Test 5d: With both filters

```graphql
query AllocateMediumArrayQuestions {
  allocateQuestionsForSession(
    count: 2
    difficulty: "Medium"
    categories: ["Array", "Dynamic Programming"]
  ) {
    id
    title
    difficulty
    category
  }
}
```

**Success Criteria**:
- ✅ Returns up to 2 questions
- ✅ All questions have "Medium" difficulty
- ✅ All questions contain at least one of the specified categories

---

## Test 6: Get Test Cases for Question (FR18)

**Purpose**: Verify test cases can be retrieved for questions

**Expected**: Returns all test cases with structured JSON input/output

```graphql
query GetTestCases {
  testCasesForQuestion(questionId: "REPLACE_WITH_ACTUAL_QUESTION_ID") {
    id
    questionId
    input
    expectedOutput
    orderIndex
    createdAt
  }
}
```

**Success Criteria**:
- ✅ Returns array of test cases
- ✅ Test cases are ordered by orderIndex
- ✅ Input and expectedOutput are valid JSON objects
- ✅ All test cases belong to the specified question

---

## Test 7: Create Question (Mutation)

**Purpose**: Verify questions can be created

**Expected**: Creates a new question and returns it

```graphql
mutation CreateTestQuestion {
  createQuestion(input: {
    title: "Test Question"
    description: "This is a test question to verify the create functionality."
    difficulty: "Easy"
    category: ["Testing", "API"]
    examples: "Example 1:\nInput: test\nOutput: success"
    constraints: "1 <= test.length <= 100"
  }) {
    id
    title
    difficulty
    category
    createdAt
  }
}
```

**Success Criteria**:
- ✅ Returns the created question with a new ID
- ✅ All fields match the input
- ✅ createdAt is set automatically

---

## Test 8: Update Question (Mutation)

**Purpose**: Verify questions can be updated

**Expected**: Updates the question and returns the updated version

```graphql
mutation UpdateTestQuestion {
  updateQuestion(
    id: "REPLACE_WITH_ACTUAL_QUESTION_ID"
    input: {
      title: "Updated Test Question"
      difficulty: "Medium"
    }
  ) {
    id
    title
    difficulty
    updatedAt
  }
}
```

**Success Criteria**:
- ✅ Returns the updated question
- ✅ Only specified fields are updated
- ✅ updatedAt timestamp is updated automatically

---

## Test 9: Delete Question (Mutation)

**Purpose**: Verify questions can be deleted

**Expected**: Deletes the question and returns true

```graphql
mutation DeleteTestQuestion {
  deleteQuestion(id: "REPLACE_WITH_ACTUAL_QUESTION_ID")
}
```

**Success Criteria**:
- ✅ Returns true on successful deletion
- ✅ Question is removed from database
- ✅ Associated test cases are also deleted (CASCADE)

---

## Test 10: Question Selection for Match

**Purpose**: Verify manual question selection workflow

### Test 10a: Get Questions for Match Selection

```graphql
query GetQuestionsForMatch {
  questionsForMatchSelection(matchId: "REPLACE_WITH_MATCH_ID") {
    id
    title
    difficulty
    category
  }
}
```

**Success Criteria**:
- ✅ Returns questions filtered by match criteria (difficulty + common topics)
- ✅ Falls back to difficulty-only if no topic matches
- ✅ Falls back to all questions if no difficulty matches

### Test 10b: Submit Question Selection

```graphql
mutation SubmitSelection {
  submitQuestionSelection(input: {
    matchId: "REPLACE_WITH_MATCH_ID"
    userId: "REPLACE_WITH_USER_ID"
    questionId: "REPLACE_WITH_QUESTION_ID"
  }) {
    status
    pendingUserIds
    selections {
      userId
      questionId
      isWinner
      submittedAt
      finalizedAt
    }
    finalQuestion {
      id
      title
      difficulty
    }
  }
}
```

**Success Criteria**:
- ✅ First submission returns status: PENDING with pendingUserIds
- ✅ Second submission returns status: COMPLETE with winner selected
- ✅ Winner is randomly chosen from both submissions
- ✅ If both select same question, that question is instantly assigned

### Test 10c: Check Selection Status

```graphql
query SelectionStatus {
  questionSelectionStatus(matchId: "REPLACE_WITH_MATCH_ID") {
    status
    pendingUserIds
    selections {
      userId
      questionId
      isWinner
      submittedAt
      finalizedAt
    }
    finalQuestion {
      id
      title
    }
  }
}
```

**Success Criteria**:
- ✅ Returns current status (PENDING/COMPLETE/ALREADY_ASSIGNED)
- ✅ Shows which users have submitted
- ✅ Shows final question once both submitted

---

## Test 11: Question Attempts (FR32)

**Purpose**: Verify question attempt history tracking

### Test 11a: Get User's Question Attempts

```graphql
query GetUserAttempts {
  questionAttemptsByUser(userId: "REPLACE_WITH_USER_ID") {
    id
    userId
    questionId
    matchId
    attemptedAt
    createdAt
    question {
      id
      title
      description
      difficulty
      category
    }
  }
}
```

**Success Criteria**:
- ✅ Returns all attempts for the user
- ✅ Includes enriched question details (title, difficulty, categories)
- ✅ Ordered by attemptedAt DESC (most recent first)
- ✅ Includes matchId for tracing back to collaboration sessions

---

## Test 12: Suggested Solutions

**Purpose**: Verify suggested solutions can be retrieved

```graphql
query GetSuggestedSolutions {
  suggestedSolutionsForQuestion(questionId: "REPLACE_WITH_QUESTION_ID") {
    id
    questionId
    language
    solutionCode
    explanation
    timeComplexity
    spaceComplexity
    approachName
    createdAt
    updatedAt
  }
}
```

**Success Criteria**:
- ✅ Returns all suggested solutions for the question
- ✅ Includes time/space complexity analysis
- ✅ Includes approach name and explanation

---

## Test 13: Error Handling

**Purpose**: Verify proper error handling

### Test 10a: Invalid Question ID

```graphql
query GetInvalidQuestion {
  question(id: "00000000-0000-0000-0000-000000000000") {
    id
    title
  }
}
```

**Expected**: Returns null (not an error)

### Test 10b: Invalid Difficulty

```graphql
query GetInvalidDifficulty {
  questionsByDifficulty(difficulty: "SuperHard") {
    id
    title
  }
}
```

**Expected**: Returns empty array (no matches)

### Test 10c: Missing Required Fields

```graphql
mutation CreateInvalidQuestion {
  createQuestion(input: {
    title: "Incomplete Question"
    # Missing required fields: description, difficulty, category
  }) {
    id
  }
}
```

**Expected**: Returns GraphQL validation error

---

## Test Checklist

Run through all tests and check off when passing:

- [ ] Test 1: Get All Questions
- [ ] Test 2: Get Single Question by ID
- [ ] Test 3: Filter by Difficulty (Easy, Medium, Hard)
- [ ] Test 4: Filter by Category
- [ ] Test 5a: Allocate Questions (no filters)
- [ ] Test 5b: Allocate Questions (difficulty filter)
- [ ] Test 5c: Allocate Questions (category filter)
- [ ] Test 5d: Allocate Questions (both filters)
- [ ] Test 6: Get Test Cases for Question
- [ ] Test 7: Create Question
- [ ] Test 8: Update Question
- [ ] Test 9: Delete Question
- [ ] Test 10a: Get Questions for Match Selection
- [ ] Test 10b: Submit Question Selection
- [ ] Test 10c: Check Selection Status
- [ ] Test 11: Get Question Attempts History
- [ ] Test 12: Get Suggested Solutions
- [ ] Test 13: Error Handling

---

## Automated Testing Script

For automated testing, you can use this curl script:

```bash
#!/bin/bash

# Test 1: Get all questions
echo "Test 1: Get All Questions"
curl -X POST http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ questions { id title difficulty } }"}' \
  | jq

echo "\n---\n"

# Test 2: Filter by difficulty
echo "Test 2: Filter by Difficulty (Easy)"
curl -X POST http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ questionsByDifficulty(difficulty: \"Easy\") { id title difficulty } }"}' \
  | jq

echo "\n---\n"

# Test 3: Allocate random questions
echo "Test 3: Allocate Random Questions"
curl -X POST http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ allocateQuestionsForSession(count: 3) { id title } }"}' \
  | jq
```

Save this as `test-api.sh`, make it executable with `chmod +x test-api.sh`, and run with `./test-api.sh`

---

## Notes

- Replace `REPLACE_WITH_ACTUAL_QUESTION_ID` with actual question IDs from your database
- Run queries in the GraphQL Playground for better visualization
- Use the "Docs" tab in Playground to explore the full schema
- Check the service logs for detailed error messages
