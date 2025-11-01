#!/usr/bin/env ts-node

/**
 * Cleanup script for Google Cloud Pub/Sub topics and subscriptions
 *
 * WARNING: This script deletes all topics and subscriptions.
 * Use with caution, especially in production environments.
 *
 * Usage:
 *   npm run cleanup:pubsub
 */

import { PubSub } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const EMULATOR_HOST = process.env.PUBSUB_EMULATOR_HOST;
const KEY_FILENAME = process.env.GCP_KEY_FILENAME;

if (!PROJECT_ID) {
    console.error('Error: GCP_PROJECT_ID environment variable is required');
    process.exit(1);
}

const TOPICS_TO_DELETE = ['matching-queue', 'question-queue', 'session-queue'];
const SUBSCRIPTIONS_TO_DELETE = ['matching-queue-sub', 'question-queue-sub', 'session-queue-sub'];

async function cleanupPubSub() {
    console.log('🧹 Starting Pub/Sub cleanup...');
    console.log(`📦 Project ID: ${PROJECT_ID}`);

    // Initialize Pub/Sub client
    const clientConfig: any = {
        projectId: PROJECT_ID,
    };

    if (KEY_FILENAME) {
        clientConfig.keyFilename = KEY_FILENAME;
        console.log(`🔑 Using service account: ${KEY_FILENAME}`);
    }

    if (EMULATOR_HOST) {
        clientConfig.apiEndpoint = EMULATOR_HOST;
        console.log(`🧪 Using emulator: ${EMULATOR_HOST}`);
    }

    const pubsub = new PubSub(clientConfig);

    try {
        // Delete subscriptions first
        console.log('\n📋 Deleting subscriptions...');
        for (const subName of SUBSCRIPTIONS_TO_DELETE) {
            const subscription = pubsub.subscription(subName);
            const [exists] = await subscription.exists();

            if (exists) {
                await subscription.delete();
                console.log(`  ✅ Deleted subscription: ${subName}`);
            } else {
                console.log(`  ⏭️  Subscription does not exist: ${subName}`);
            }
        }

        // Delete topics
        console.log('\n📋 Deleting topics...');
        for (const topicName of TOPICS_TO_DELETE) {
            const topic = pubsub.topic(topicName);
            const [exists] = await topic.exists();

            if (exists) {
                await topic.delete();
                console.log(`  ✅ Deleted topic: ${topicName}`);
            } else {
                console.log(`  ⏭️  Topic does not exist: ${topicName}`);
            }
        }

        console.log('\n✨ Pub/Sub cleanup completed successfully!');

    } catch (error) {
        console.error('\n❌ Error cleaning up Pub/Sub:', error);
        process.exit(1);
    }
}

// Run the cleanup
cleanupPubSub().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
