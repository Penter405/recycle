"""
Keras 3 to TensorFlow.js Format Converter
Fixes model.json from Keras 3 format to be compatible with TensorFlow.js

Changes:
1. batch_shape -> batchInputShape
2. DTypePolicy object -> simple string
3. inbound_nodes format conversion
4. Initializer format simplification
"""

import json
import sys
import copy

def fix_dtype(config):
    """Convert DTypePolicy object to simple string"""
    if isinstance(config.get('dtype'), dict):
        dtype_obj = config['dtype']
        if dtype_obj.get('class_name') == 'DTypePolicy':
            config['dtype'] = dtype_obj.get('config', {}).get('name', 'float32')
    return config

def fix_initializer(init_config):
    """Convert Keras 3 initializer format to simpler format"""
    if isinstance(init_config, dict):
        if 'module' in init_config:
            # Keras 3 format: {"module": "keras.initializers", "class_name": "GlorotUniform", ...}
            return {
                'class_name': init_config.get('class_name'),
                'config': init_config.get('config', {})
            }
    return init_config

def fix_inbound_nodes(nodes):
    """Convert Keras 3 inbound_nodes format to Keras 2 format"""
    if not nodes:
        return nodes
    
    fixed_nodes = []
    for node in nodes:
        if isinstance(node, dict) and 'args' in node:
            # Keras 3 format: {"args": [...], "kwargs": {...}}
            args = node.get('args', [])
            if args and isinstance(args[0], dict) and args[0].get('class_name') == '__keras_tensor__':
                # Extract layer connection info
                keras_history = args[0].get('config', {}).get('keras_history', [])
                if keras_history:
                    fixed_nodes.append([keras_history])
            elif args and isinstance(args[0], list):
                # Multiple inputs (like Add layer)
                connections = []
                for arg in args[0]:
                    if isinstance(arg, dict) and arg.get('class_name') == '__keras_tensor__':
                        keras_history = arg.get('config', {}).get('keras_history', [])
                        if keras_history:
                            connections.append(keras_history)
                if connections:
                    fixed_nodes.append(connections)
        else:
            fixed_nodes.append(node)
    
    return fixed_nodes

def fix_layer_config(layer):
    """Fix a single layer's configuration"""
    config = layer.get('config', {})
    
    # Fix batch_shape -> batchInputShape for InputLayer
    if layer.get('class_name') == 'InputLayer':
        if 'batch_shape' in config:
            config['batchInputShape'] = config.pop('batch_shape')
    
    # Fix dtype
    config = fix_dtype(config)
    
    # Fix initializers
    for key in ['kernel_initializer', 'bias_initializer', 'depthwise_initializer',
                'beta_initializer', 'gamma_initializer', 
                'moving_mean_initializer', 'moving_variance_initializer']:
        if key in config:
            config[key] = fix_initializer(config[key])
    
    layer['config'] = config
    
    # Fix inbound_nodes
    if 'inbound_nodes' in layer:
        layer['inbound_nodes'] = fix_inbound_nodes(layer['inbound_nodes'])
    
    return layer

def convert_model(input_path, output_path):
    """Convert Keras 3 model.json to TF.js compatible format"""
    print(f"Loading {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        model = json.load(f)
    
    # Update version info
    if 'generatedBy' in model:
        model['generatedBy'] = 'keras v2.15.0 (converted from Keras 3)'
    
    # Fix model topology
    if 'modelTopology' in model:
        topology = model['modelTopology']
        
        # Update keras_version
        if 'keras_version' in topology:
            topology['keras_version'] = '2.15.0'
        
        # Fix layers in model_config
        if 'model_config' in topology:
            model_config = topology['model_config']
            if 'config' in model_config and 'layers' in model_config['config']:
                layers = model_config['config']['layers']
                print(f"Processing {len(layers)} layers...")
                
                for i, layer in enumerate(layers):
                    layers[i] = fix_layer_config(layer)
                    if (i + 1) % 20 == 0:
                        print(f"  Processed {i + 1}/{len(layers)} layers")
    
    # Save fixed model
    print(f"Saving to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(model, f)
    
    print("✅ Conversion complete!")
    return True

if __name__ == '__main__':
    input_file = 'docs/model/model.json'
    output_file = 'docs/model/model.json'
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    convert_model(input_file, output_file)
