const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Session = require('./models/Session');
const Answer = require('./models/Answer');
const ConceptMastery = require('./models/ConceptMastery');

const CONCEPTS = {
  algorithms: ['Recursion', 'Sorting', 'Graph Algorithms', 'Dynamic Programming', 'Binary Search'],
  mathematics: ['Algebra', 'Calculus', 'Statistics', 'Linear Algebra', 'Discrete Math'],
  oop: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Design Patterns', 'SOLID'],
  databases: ['SQL Joins', 'Indexing', 'Normalization', 'Transactions', 'Query Optimization'],
};

const QUESTIONS = {
  algorithms: [
    { q: 'Implement a recursive function that calculates the factorial of a number n.', type: 'code', diff: 2 },
    { q: 'What is the time complexity of Merge Sort?', type: 'multiple_choice', diff: 1 },
    { q: 'Explain how Dijkstra\'s algorithm finds the shortest path in a weighted graph.', type: 'text', diff: 3 },
    { q: 'Write a C# method that performs binary search on a sorted array.', type: 'code', diff: 3 },
    { q: 'Compare and contrast DFS and BFS traversal algorithms.', type: 'text', diff: 4 },
    { q: 'Write a function to solve the 0/1 Knapsack problem using dynamic programming.', type: 'code', diff: 5 },
    { q: 'Which sorting algorithm has the best average-case time complexity?', type: 'multiple_choice', diff: 2 },
    { q: 'Implement an iterative binary search algorithm in C#.', type: 'code', diff: 2 },
    { q: 'Explain the difference between memoization and tabulation in DP.', type: 'text', diff: 4 },
    { q: 'What is the space complexity of a recursive Fibonacci implementation?', type: 'multiple_choice', diff: 3 },
  ],
  mathematics: [
    { q: 'Solve: 3x + 7 = 22. Find the value of x.', type: 'text', diff: 1 },
    { q: 'What is the derivative of f(x) = 3x^2 + 2x + 1?', type: 'multiple_choice', diff: 2 },
    { q: 'Explain the Central Limit Theorem and its significance.', type: 'text', diff: 4 },
    { q: 'Calculate the determinant of a 2x2 matrix [[3,1],[5,2]].', type: 'text', diff: 2 },
    { q: 'How many ways can you arrange 5 books on a shelf?', type: 'multiple_choice', diff: 1 },
    { q: 'Prove that the sum of angles in a triangle is 180 degrees.', type: 'text', diff: 3 },
    { q: 'What is the integral of sin(x) dx?', type: 'multiple_choice', diff: 2 },
    { q: 'Explain eigenvalues and eigenvectors in linear algebra.', type: 'text', diff: 5 },
    { q: 'In a normal distribution, what percentage falls within 2 standard deviations?', type: 'multiple_choice', diff: 3 },
    { q: 'Solve the recurrence relation T(n) = 2T(n/2) + n using the Master Theorem.', type: 'text', diff: 4 },
  ],
  oop: [
    { q: 'What is the difference between an abstract class and an interface in C#?', type: 'multiple_choice', diff: 2 },
    { q: 'Write a C# class hierarchy for a Shape with Circle and Rectangle subclasses.', type: 'code', diff: 3 },
    { q: 'Explain the SOLID principles with examples.', type: 'text', diff: 4 },
    { q: 'Implement the Observer design pattern in C#.', type: 'code', diff: 5 },
    { q: 'What is encapsulation and why is it important?', type: 'text', diff: 1 },
    { q: 'Which keyword prevents a class from being inherited in C#?', type: 'multiple_choice', diff: 1 },
    { q: 'Write a generic Stack<T> class in C# with Push, Pop, and Peek methods.', type: 'code', diff: 3 },
    { q: 'Explain method overloading vs method overriding.', type: 'text', diff: 2 },
    { q: 'Implement the Strategy pattern for different sorting algorithms.', type: 'code', diff: 4 },
    { q: 'What is the Liskov Substitution Principle?', type: 'multiple_choice', diff: 3 },
  ],
  databases: [
    { q: 'Write a SQL query to find all employees with salary > 50000.', type: 'code', diff: 1 },
    { q: 'What is the difference between INNER JOIN and LEFT JOIN?', type: 'multiple_choice', diff: 2 },
    { q: 'Explain the three normal forms (1NF, 2NF, 3NF) with examples.', type: 'text', diff: 3 },
    { q: 'Write a query using GROUP BY to count orders per customer.', type: 'code', diff: 2 },
    { q: 'What is an ACID transaction? Explain each property.', type: 'text', diff: 4 },
    { q: 'Write a SQL query with a subquery to find the second highest salary.', type: 'code', diff: 3 },
    { q: 'Which index type is best for range queries?', type: 'multiple_choice', diff: 3 },
    { q: 'Explain the difference between clustered and non-clustered indexes.', type: 'text', diff: 4 },
    { q: 'Write an optimised query joining three tables with proper indexing hints.', type: 'code', diff: 5 },
    { q: 'What isolation level prevents phantom reads?', type: 'multiple_choice', diff: 4 },
  ],
};

const FEEDBACK = [
  'Good attempt! Review the core concept and try again.',
  'Excellent work! You demonstrated a strong understanding.',
  'Partially correct. Consider the edge cases in your solution.',
  'Great job! Your logic is sound and well-structured.',
  'Not quite right. Focus on the fundamental definition here.',
  'Well done! Keep up the momentum.',
  'Incorrect, but you are on the right track. Review the syntax.',
  'Perfect answer! You clearly understand this concept.',
  'Almost there! Double-check your boundary conditions.',
  'Good effort. Try breaking the problem into smaller parts.',
];

const ANSWERS_MC = ['O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear all collections
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
      Answer.deleteMany({}),
      ConceptMastery.deleteMany({}),
    ]);
    console.log('All collections cleared');

    const passwordHash = await bcrypt.hash('Test1234', 12);

    const usersData = [
      { username: 'student1', email: 'student1@test.com', passwordHash, role: 'user', profile: { displayName: 'student1', totalSessions: 0, streakDays: 3 } },
      { username: 'student2', email: 'student2@test.com', passwordHash, role: 'user', profile: { displayName: 'student2', totalSessions: 0, streakDays: 7 } },
    ];

    const users = await User.insertMany(usersData);
    console.log(`Created ${users.length} users`);

    const sessionSubjects = ['algorithms', 'mathematics', 'oop'];

    for (const user of users) {
      let userTotalSessions = 0;

      for (const subject of sessionSubjects) {
        const concepts = CONCEPTS[subject];
        const questions = QUESTIONS[subject];

        let correct = 0;
        const difficulties = [];

        // Create session first
        const session = await Session.create({
          userId: user._id,
          subject,
          startedAt: new Date(Date.now() - rand(1, 14) * 24 * 60 * 60 * 1000),
          endedAt: new Date(Date.now() - rand(0, 1) * 24 * 60 * 60 * 1000),
          totalQuestions: 10,
          correctAnswers: 0,
          averageDifficulty: 0,
          difficultyProgression: [],
        });

        // Create 10 answers per session
        for (let i = 0; i < 10; i++) {
          const q = questions[i];
          const isCorrect = Math.random() > 0.4;
          if (isCorrect) correct++;
          difficulties.push(q.diff);

          const userAnswer = q.type === 'multiple_choice'
            ? pick(ANSWERS_MC)
            : q.type === 'code'
              ? '// Student code submission here\nconsole.log("solution");'
              : 'The answer involves understanding the core concept and applying it step by step.';

          await Answer.create({
            userId: user._id,
            sessionId: session._id,
            subject,
            concept: concepts[i % concepts.length],
            difficulty: q.diff,
            questionText: q.q,
            answerType: q.type,
            userAnswer,
            isCorrect,
            score: isCorrect ? rand(70, 100) : rand(10, 45),
            aiFeedback: pick(FEEDBACK),
            aiExplanation: 'The correct approach requires understanding the fundamental principles of this topic and applying them systematically.',
            timeSpentSeconds: rand(15, 120),
            createdAt: new Date(Date.now() - rand(0, 7) * 24 * 60 * 60 * 1000),
          });
        }

        // Update session stats
        const avgDiff = Math.round((difficulties.reduce((a, b) => a + b, 0) / difficulties.length) * 100) / 100;
        session.correctAnswers = correct;
        session.averageDifficulty = avgDiff;
        session.difficultyProgression = difficulties;
        await session.save();

        userTotalSessions++;
        console.log(`  Created session: ${user.username} / ${subject} — ${correct}/10 correct`);

        // Create ConceptMastery for each concept in this subject
        for (const concept of concepts) {
          const pL = Math.round((0.1 + Math.random() * 0.8) * 1000) / 1000;
          const attempts = rand(3, 15);
          const correctAttempts = Math.floor(attempts * pL);

          await ConceptMastery.findOneAndUpdate(
            { userId: user._id, subject, concept },
            {
              pL,
              pT: 0.2,
              pS: 0.1,
              pG: 0.2,
              attempts,
              correctAttempts,
              mastered: pL > 0.95,
              lastAttemptAt: new Date(),
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        }
      }

      // Update user profile
      user.profile.totalSessions = userTotalSessions;
      user.profile.lastActiveDate = new Date();
      await user.save();
      console.log(`Updated profile for ${user.username}: ${userTotalSessions} sessions`);
    }

    // Summary
    const counts = await Promise.all([
      User.countDocuments(),
      Session.countDocuments(),
      Answer.countDocuments(),
      ConceptMastery.countDocuments(),
    ]);

    console.log('\n--- Seed Complete ---');
    console.log(`Users:          ${counts[0]}`);
    console.log(`Sessions:       ${counts[1]}`);
    console.log(`Answers:        ${counts[2]}`);
    console.log(`ConceptMastery: ${counts[3]}`);
    console.log('\nTest credentials:');
    console.log('  student1@test.com / Test1234');
    console.log('  student2@test.com / Test1234');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
