import { PubSub } from "@google-cloud/pubsub";
import { SessionEventPayload, TOPICS } from "@noclue/common";
import { createClient } from "@supabase/supabase-js";

// ==== How to run this test ====
// 1. Ensure matching service is running locally somehow
// 2. Export the below 5 env variables in a terminal
// 3. Insert a valid match id below
// 4. Have gcp-pubsub-key.json in the root
// 5. npx ts-node <dir-to-this-file>

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const EMULATOR_HOST = process.env.PUBSUB_EMULATOR_HOST;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const GCP_KEY_FILENAME = process.env.GCP_KEY_FILENAME;

// INSERT YOUR TEST MATCH ID HERE
const TEST_MATCH_ID = "<insert-test-match-id-here>";

async function testSessionExpiredFlow() {
    console.log("Starting Session Expired Integration Test");

    const pubsub = new PubSub({
        projectId: PROJECT_ID,
        ...(EMULATOR_HOST && { apiEndpoint: EMULATOR_HOST }),
        ...(GCP_KEY_FILENAME && { keyFilename: GCP_KEY_FILENAME })    
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const testPayload: SessionEventPayload = {
        matchId: TEST_MATCH_ID,
        sessionId: "test-session-123",
        eventType: "session_expired",
        timestamp: new Date().toISOString(),
    }

    console.log("Publishing session_expired event...");
    console.log(JSON.stringify(testPayload, null, 2));

    try {
        // Publish event
        const topic = pubsub.topic(TOPICS.SESSION_QUEUE);
        const messageId = await topic.publishMessage({
            json: testPayload,
        });

        console.log(`Published message with ID: ${messageId}`);

        // Wait for processing
        console.log("Waiting 3 seconds for event to be processed...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if match status is updated in Supabase
        const { data, error } = await supabase
            .from('matches')
            .select('status')
            .eq('id', testPayload.matchId)
            .single();
        
        if (error) {
            console.error("Error fetching match status from Supabase:", error);
            return;
        }

        const newStatus = data?.status;

        if (newStatus === 'ended') {
             console.log(`Success! Match status updated to: **${newStatus}**`);
        } else if (newStatus) {
             console.log(`Test Failed! Match status is **${newStatus}**, expected 'ended'.`);
        } else {
             console.log('Test Failed! Match not found or status is NULL.');
        }
    } catch (error) {
        console.error("Test failed: ", error);
    } finally {
        console.log("Integration Test Concluded");
    }
}

testSessionExpiredFlow().catch(console.error);