import { PubSub } from "@google-cloud/pubsub";
import { SessionEventPayload, TOPICS } from "@noclue/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ==== How to run this test ====
// 1. Ensure matching service is running locally somehow
// 2. Export the below 5 env variables in a terminal
// 3. Insert a valid match id below (must have an associated 'sessions' record)
// 4. Have gcp-pubsub-key.json in the root (or configure auth)
// 5. npx ts-node <dir-to-this-file>

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const EMULATOR_HOST = process.env.PUBSUB_EMULATOR_HOST;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const GCP_KEY_FILENAME = process.env.GCP_KEY_FILENAME;

// INSERT YOUR TEST MATCH ID HERE (MUST BE LINKED TO A SESSION RECORD)
const TEST_MATCH_ID = "e0a43041-3ef8-46d4-b25c-b29b2601f1ce";

async function checkDatabaseStatus(supabase: SupabaseClient, matchId: string): Promise<boolean> {
    let allChecksPassed = true;

    // --- 1. Check 'matches' table ---
    console.log(`\nChecking 'matches' status for ID: ${matchId}`);
    const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('status')
        .eq('id', matchId)
        .single();
    
    if (matchError) {
        console.error("❌ Error fetching match status:", matchError);
        return false;
    }

    const matchStatus = matchData?.status;
    if (matchStatus === 'ended') {
        console.log(`✅ Success! Match status updated to: **${matchStatus}**`);
    } else if (matchStatus) {
        console.log(`❌ Test Failed! Match status is **${matchStatus}**, expected 'ended'.`);
        allChecksPassed = false;
    } else {
        console.log('❌ Test Failed! Match not found or status is NULL.');
        allChecksPassed = false;
    }

    // --- 2. Check 'sessions' table ---
    console.log(`\nChecking 'sessions' status linked to match ID: ${matchId}`);
    const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('status')
        .eq('match_id', matchId) 
        .limit(1)
        .single();
    
    if (sessionError && sessionError.code !== 'PGRST116') { // Ignore no rows found error (PGRST116)
        console.error("❌ Error fetching session status:", sessionError);
        return false;
    }

    const sessionStatus = sessionData?.status;
    if (sessionStatus === 'ended') {
        console.log(`✅ Success! Session status updated to: **${sessionStatus}**`);
    } else if (sessionStatus) {
        console.log(`❌ Test Failed! Session status is **${sessionStatus}**, expected 'ended'.`);
        allChecksPassed = false;
    } else {
        console.log('❌ Test Failed! Session not found or status is NULL.');
        allChecksPassed = false;
    }

    return allChecksPassed;
}


async function testSessionExpiredFlow() {
    console.log("Starting Session Expired Integration Test 🚀");
    console.log("------------------------------------------------");

    let finalSuccess = false;

    const pubsub = new PubSub({
        projectId: PROJECT_ID,
        ...(EMULATOR_HOST && { apiEndpoint: EMULATOR_HOST }),
        ...(GCP_KEY_FILENAME && { keyFilename: GCP_KEY_FILENAME })    
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const testPayload: SessionEventPayload = {
        matchId: TEST_MATCH_ID,
        sessionId: "test-session-123", // Doesn't have to be real, but must be present in the payload
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
        console.log("Waiting 3 seconds for event to be processed by MatchingService...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if both match and session statuses are updated in Supabase
        finalSuccess = await checkDatabaseStatus(supabase, TEST_MATCH_ID);
        
    } catch (error) {
        console.error("Test failed: ", error);
    } finally {
        console.log("------------------------------------------------");
        if (finalSuccess) {
            console.log("✅✅ INTEGRATION TEST PASSED SUCCESSFULLY (MATCHES & SESSIONS EXPIRED)");
        } else {
            console.log("❌❌ INTEGRATION TEST FAILED. Check console errors above.");
        }
        console.log("Integration Test Concluded");
    }
}

testSessionExpiredFlow().catch(console.error);