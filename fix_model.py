"""Fix model.json for TensorFlow.js compatibility"""
import json

# Read model.json
with open('docs/model/model.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Keras 3 format with TensorFlow.js expected format
content = content.replace('"batch_shape"', '"batchInputShape"')

# Write back
with open('docs/model/model.json', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed! Replaced batch_shape with batchInputShape")
