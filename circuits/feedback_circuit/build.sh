#!/bin/bash

set -e

rm -rf target

echo "🔨 Compiling circuit..."
if ! nargo compile; then
    echo "❌ Compilation failed. Exiting..."
    exit 1
fi

# Auto-detect circuit JSON file
CIRCUIT_JSON=$(ls target/*.json | head -n 1)

if [ -z "$CIRCUIT_JSON" ]; then
    echo "❌ No compiled circuit JSON found in target/"
    exit 1
fi

echo "✅ Compilation successful: $CIRCUIT_JSON"

echo "📏 Gate count:"
bb gates -b "$CIRCUIT_JSON" | jq '.functions[0].circuit_size'

OUTPUT_DIR="../../public/circuit/feedback_circuit"
mkdir -p "$OUTPUT_DIR"

echo "📁 Copying feedback_circuit.json to $OUTPUT_DIR..."
cp "$CIRCUIT_JSON" "$OUTPUT_DIR/feedback_circuit.json"

echo "🧷 Generating vkey..."
bb write_vk -b "$CIRCUIT_JSON" -o ./target

echo "🧷 Exporting vkey to circuit-vkey.json..."
node -e "const fs = require('fs'); fs.writeFileSync('$OUTPUT_DIR/feedback_circuit-vkey.json', JSON.stringify(Array.from(Uint8Array.from(fs.readFileSync('./target/vk')))));"

