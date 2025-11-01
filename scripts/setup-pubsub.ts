#!/usr/bin/env ts-node

/**
 * Setup script for Google Cloud Pub/Sub topics and subscriptions
 *
 * This script creates all required topics and subscriptions for the noclue application.
 *
 * Usage:
 *   npm run setup:pubsub
 *
 * Environment variables:
 *   GCP_PROJECT_ID - Google Cloud project ID
 *   PUBSUB_EMULATOR_HOST - (Optional) Emulator host for local development
 *   GCP_KEY_FILENAME - (Optional) Path to service account key file
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

// Topics and their subscriptions
const TOPIC_CONFIG = [
    {
        topicName: 'matching-queue',
        subscriptions: [
            {
                name: 'matching-queue-sub',
                config: {
                    ackDeadlineSeconds: 60,
                    messageRetentionDuration: { seconds: 604800 }, // 7 days
                    retryPolicy: {
                        minimumBackoff: { seconds: 10 },
                        maximumBackoff: { seconds: 600 },
                    },
                },
            },
        ],
    },
    {
        topicName: 'question-queue',
        subscriptions: [
            {
                name: 'question-queue-sub',
                config: {
                    ackDeadlineSeconds: 60,
                    messageRetentionDuration: { seconds: 604800 }, // 7 days
                    retryPolicy: {
                        minimumBackoff: { seconds: 10 },
                        maximumBackoff: { seconds: 600 },
                    },
                },
            },
        ],
    },
    {
        topicName: 'session-queue',
        subscriptions: [
            {
                name: 'session-queue-sub',
                config: {
                    ackDeadlineSeconds: 60,
                    messageRetentionDuration: { seconds: 604800 }, // 7 days
                    retryPolicy: {
                        minimumBackoff: { seconds: 10 },
                        maximumBackoff: { seconds: 600 },
                    },
                },
            },
        ],
    },
];

async function setupPubSub() {
    console.log('🚀 Starting Pub/Sub setup...');
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
        // Create topics and subscriptions
        for (const topicConfig of TOPIC_CONFIG) {
            const { topicName, subscriptions } = topicConfig;

            console.log(`\n📋 Processing topic: ${topicName}`);

            // Create or get topic
            const topic = pubsub.topic(topicName);
            const [topicExists] = await topic.exists();

            if (!topicExists) {
                await topic.create();
                console.log(`  ✅ Created topic: ${topicName}`);
            } else {
                console.log(`  ℹ️  Topic already exists: ${topicName}`);
            }

            // Create subscriptions
            for (const sub of subscriptions) {
                const subscription = topic.subscription(sub.name);
                const [subExists] = await subscription.exists();

                if (!subExists) {
                    await topic.createSubscription(sub.name, sub.config);
                    console.log(`  ✅ Created subscription: ${sub.name}`);
                } else {
                    console.log(`  ℹ️  Subscription already exists: ${sub.name}`);
                }
            }
        }

        console.log('\n✨ Pub/Sub setup completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`  Topics: ${TOPIC_CONFIG.length}`);
        console.log(`  Subscriptions: ${TOPIC_CONFIG.reduce((acc, t) => acc + t.subscriptions.length, 0)}`);

        console.log('\n🔍 Topic → Subscription mapping:');
        TOPIC_CONFIG.forEach((t) => {
            console.log(`  ${t.topicName}:`);
            t.subscriptions.forEach((s) => {
                console.log(`    └─ ${s.name}`);
            });
        });

    } catch (error) {
        console.error('\n❌ Error setting up Pub/Sub:', error);
        process.exit(1);
    }
}

// Run the setup
setupPubSub().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
