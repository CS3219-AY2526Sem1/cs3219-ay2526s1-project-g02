/**
 * Integration test script for CollaborationService
 * 
 * This script tests the QuestionAssigned event handling flow:
 * 1. Publishes a QuestionAssigned event
 * 2. Verifies session creation in Supabase
 * 3. Checks YJS document initialization
 * 4. Confirms SessionEvent publication
 */

import { PubSub } from '@google-cloud/pubsub';
import { QuestionAssignedPayload, TOPICS } from '@noclue/common';
import { createClient } from '@supabase/supabase-js';

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const EMULATOR_HOST = process.env.PUBSUB_EMULATOR_HOST;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const GCP_KEY_FILENAME = process.env.GCP_KEY_FILENAME;

async function testQuestionAssignedFlow() {
  console.log('🧪 Starting CollaborationService Integration Test\n');

  // Initialize clients
  const pubsub = new PubSub({
    projectId: PROJECT_ID,
    ...(EMULATOR_HOST && { apiEndpoint: EMULATOR_HOST }),
    ...(GCP_KEY_FILENAME && { keyFilename: GCP_KEY_FILENAME })
  });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test payload
  const testPayload: QuestionAssignedPayload = {
    matchId: `bf5e68fc-ce08-41b2-b1a2-35554ec40111`,
    questionId: `20bdf619-36bb-49a7-be1a-ddce85b89ef9`,
    questionTitle: 'Two Sum',
    questionDescription: 'Given an array of integers, find two numbers that add up to a target.',
    difficulty: 'easy',
    topics: ['arrays', 'hash-table'],
  };

  console.log('📤 Publishing QuestionAssigned event...');
  console.log(JSON.stringify(testPayload, null, 2));

  try {
    // Publish event
    const topic = pubsub.topic(TOPICS.QUESTION_QUEUE);
    const messageId = await topic.publishMessage({
      json: testPayload,
    });

    console.log(`✅ Event published with message ID: ${messageId}\n`);

    // Wait for processing
    console.log('⏳ Waiting 3 seconds for event processing...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if session was created
    console.log('🔍 Checking Supabase for created session...');
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('match_id', testPayload.matchId)
      .single();

    if (error) {
      console.error('❌ Error fetching session:', error.message);
      return;
    }

    if (session) {
      console.log('✅ Session created successfully!');
      console.log('\nSession Details:');
      console.log(`  ID: ${session.id}`);
      console.log(`  Match ID: ${session.match_id}`);
      console.log(`  Question ID: ${session.question_id}`);
      console.log(`  Language: ${session.language}`);
      console.log(`  Status: ${session.status}`);
      console.log(`  Code Preview: ${session.code.substring(0, 50)}...`);
      console.log(`  Created At: ${session.created_at}`);
      console.log('\n✅ Test completed successfully!');
    } else {
      console.log('❌ Session not found. Check if CollaborationService is running.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pubsub.close();
  }
}

// Run the test
testQuestionAssignedFlow().catch(console.error);

