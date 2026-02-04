"""
Fix model.json for TensorFlow.js compatibility with Keras 3
Keras 3 uses new format that TFJS doesn't understand
"""
import json
import re

print("Loading model.json...")
with open('docs/model/model.json', 'r', encoding='utf-8') as f:
    model = json.load(f)

def fix_inbound_nodes(nodes):
    """Convert Keras 3 inbound_nodes format to TFJS format"""
    if not nodes:
        return []
    
    fixed_nodes = []
    for node in nodes:
        if isinstance(node, dict) and 'args' in node:
            # Keras 3 format: {"args": [...], "kwargs": {...}}
            # TFJS expects: [[layer_name, node_index, tensor_index, kwargs]]
            args = node.get('args', [])
            kwargs = node.get('kwargs', {})
            
            # Extract tensor info from args
            if args and isinstance(args[0], dict) and 'keras_history' in args[0].get('config', {}):
                # Single input
                config = args[0]['config']
                keras_history = config['keras_history']
                fixed_nodes.append([[keras_history[0], keras_history[1], keras_history[2], kwargs]])
            elif args and isinstance(args[0], list):
                # Multiple inputs (for Add layers etc)
                inputs = []
                for arg in args[0]:
                    if isinstance(arg, dict) and 'config' in arg:
                        config = arg['config']
                        keras_history = config['keras_history']
                        inputs.append([keras_history[0], keras_history[1], keras_history[2], {}])
                fixed_nodes.append(inputs)
            else:
                fixed_nodes.append(node)
        else:
            fixed_nodes.append(node)
    
    return fixed_nodes

def fix_layer_config(layer):
    """Fix layer configuration for TFJS compatibility"""
    config = layer.get('config', {})
    
    # Fix InputLayer
    if layer.get('class_name') == 'InputLayer':
        if 'batch_shape' in config:
            config['batchInputShape'] = config.pop('batch_shape')
        if 'ragged' in config:
            del config['ragged']
    
    # Fix dtype format (Keras 3 uses nested dict)
    if 'dtype' in config and isinstance(config['dtype'], dict):
        dtype_config = config['dtype'].get('config', {})
        config['dtype'] = dtype_config.get('name', 'float32')
    
    # Fix initializers
    for key in ['kernel_initializer', 'bias_initializer', 'depthwise_initializer', 
                'beta_initializer', 'gamma_initializer', 'moving_mean_initializer',
                'moving_variance_initializer']:
        if key in config and isinstance(config[key], dict):
            init = config[key]
            if 'module' in init:
                del init['module']
            if 'registered_name' in init:
                del init['registered_name']
    
    # Fix inbound_nodes
    if 'inbound_nodes' in layer:
        layer['inbound_nodes'] = fix_inbound_nodes(layer['inbound_nodes'])
    
    return layer

print("Fixing model topology...")
if 'modelTopology' in model:
    topology = model['modelTopology']
    
    if 'model_config' in topology:
        model_config = topology['model_config']
        if 'config' in model_config:
            layers = model_config['config'].get('layers', [])
            for i, layer in enumerate(layers):
                layers[i] = fix_layer_config(layer)
                
print("Saving fixed model.json...")
with open('docs/model/model.json', 'w', encoding='utf-8') as f:
    json.dump(model, f)

print("Done! Model.json has been patched for TFJS compatibility.")
