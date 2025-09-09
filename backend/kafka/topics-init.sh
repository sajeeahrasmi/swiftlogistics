#!/bin/bash

# Kafka Topics Initialization Script for SwiftLogistics
# This script creates all necessary Kafka topics for the microservices

set -e

KAFKA_BROKER=${KAFKA_BROKER:-localhost:9092}
REPLICATION_FACTOR=${REPLICATION_FACTOR:-1}
PARTITIONS=${PARTITIONS:-3}

echo "Creating Kafka topics for SwiftLogistics..."
echo "Kafka Broker: $KAFKA_BROKER"
echo "Replication Factor: $REPLICATION_FACTOR"
echo "Partitions: $PARTITIONS"

# Function to create topic
create_topic() {
    local topic_name=$1
    local partitions=${2:-$PARTITIONS}
    local replication=${3:-$REPLICATION_FACTOR}
    
    echo "Creating topic: $topic_name"
    kafka-topics --bootstrap-server $KAFKA_BROKER \
                 --create \
                 --if-not-exists \
                 --topic $topic_name \
                 --partitions $partitions \
                 --replication-factor $replication
}

# Wait for Kafka to be ready
echo "Waiting for Kafka to be ready..."
timeout=60
counter=0

while ! kafka-topics --bootstrap-server $KAFKA_BROKER --list > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "Timeout waiting for Kafka to be ready"
        exit 1
    fi
    echo "Waiting for Kafka... ($counter/$timeout)"
    sleep 1
    counter=$((counter + 1))
done

echo "Kafka is ready!"

# Create topics for each service
echo "Creating authentication service topics..."
create_topic "user-events" 3 1

echo "Creating order service topics..."
create_topic "order-events" 5 1
create_topic "order-status-updates" 3 1

echo "Creating tracking service topics..."
create_topic "tracking-events" 5 1
create_topic "location-updates" 10 1

echo "Creating driver service topics..."
create_topic "driver-events" 3 1
create_topic "driver-location" 10 1

echo "Creating route service topics..."
create_topic "route-events" 3 1
create_topic "route-optimization" 3 1

echo "Creating notification service topics..."
create_topic "notification-events" 5 1
create_topic "email-notifications" 3 1
create_topic "push-notifications" 5 1

echo "Creating system-wide topics..."
create_topic "system-events" 3 1
create_topic "audit-log" 5 1
create_topic "error-events" 3 1

# Create dead letter queue topics
echo "Creating dead letter queue topics..."
create_topic "dlq-user-events" 1 1
create_topic "dlq-order-events" 1 1
create_topic "dlq-tracking-events" 1 1
create_topic "dlq-driver-events" 1 1
create_topic "dlq-route-events" 1 1
create_topic "dlq-notification-events" 1 1

# List all topics
echo ""
echo "Successfully created topics:"
kafka-topics --bootstrap-server $KAFKA_BROKER --list

# Show topic details
echo ""
echo "Topic configurations:"
for topic in $(kafka-topics --bootstrap-server $KAFKA_BROKER --list); do
    echo "Topic: $topic"
    kafka-topics --bootstrap-server $KAFKA_BROKER --describe --topic $topic
    echo "---"
done

echo ""
echo "Kafka topics initialization completed successfully!"
echo "You can view topics in Kafka UI at: http://localhost:8080"