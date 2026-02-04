"""
Comprehensive Keras 3 to TensorFlow.js format converter
Converts model.json from Keras 3 format to TFJS-compatible format
"""
import json
import copy

def convert_keras3_to_tfjs(input_path, output_path):
    print(f"Loading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        model = json.load(f)
    
    print(f"Original: {model.get('generatedBy')}, {model.get('convertedBy')}")
    
    # Process modelTopology
    if 'modelTopology' in model:
        topology = model['modelTopology']
        
        if 'model_config' in topology:
            model_config = topology['model_config']
            
            if 'config' in model_config:
                config = model_config['config']
                layers = config.get('layers', [])
                
                # Process each layer
                for layer in layers:
                    fix_layer(layer)
                
                # Fix input/output layers references
                if 'input_layers' in config:
                    config['input_layers'] = fix_layer_refs(config['input_layers'])
                if 'output_layers' in config:
                    config['output_layers'] = fix_layer_refs(config['output_layers'])
    
    print(f"Saving to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(model, f, separators=(',', ':'))
    
    print("Done!")

def fix_layer(layer):
    """Fix a single layer's configuration"""
    class_name = layer.get('class_name', '')
    config = layer.get('config', {})
    
    # 1. Fix InputLayer - batch_shape -> batchInputShape
    if class_name == 'InputLayer':
        if 'batch_shape' in config:
            config['batchInputShape'] = config.pop('batch_shape')
        # Remove Keras 3 specific fields
        for key in ['ragged', 'type_spec']:
            if key in config:
                del config[key]
    
    # 2. Fix dtype - convert from object to string
    if 'dtype' in config:
        dtype = config['dtype']
        if isinstance(dtype, dict):
            config['dtype'] = dtype.get('config', {}).get('name', 'float32')
    
    # 3. Fix initializers - remove module and registered_name
    initializer_keys = [
        'kernel_initializer', 'bias_initializer', 'depthwise_initializer',
        'beta_initializer', 'gamma_initializer', 
        'moving_mean_initializer', 'moving_variance_initializer'
    ]
    for key in initializer_keys:
        if key in config and isinstance(config[key], dict):
            init = config[key]
            for remove_key in ['module', 'registered_name']:
                if remove_key in init:
                    del init[remove_key]
    
    # 4. Fix inbound_nodes - convert from Keras 3 format to TFJS format
    if 'inbound_nodes' in layer:
        layer['inbound_nodes'] = fix_inbound_nodes(layer['inbound_nodes'])

def fix_inbound_nodes(nodes):
    """Convert Keras 3 inbound_nodes to TFJS format"""
    if not nodes:
        return []
    
    fixed_nodes = []
    for node in nodes:
        if isinstance(node, dict) and 'args' in node:
            # Keras 3 format: {"args": [...], "kwargs": {...}}
            args = node.get('args', [])
            kwargs = node.get('kwargs', {})
            
            # Clean kwargs - remove 'mask' if null
            clean_kwargs = {k: v for k, v in kwargs.items() if v is not None}
            
            if args:
                first_arg = args[0]
                
                # Single input tensor
                if isinstance(first_arg, dict) and first_arg.get('class_name') == '__keras_tensor__':
                    keras_history = first_arg.get('config', {}).get('keras_history', [])
                    if keras_history:
                        # TFJS format: [[layer_name, node_index, tensor_index, kwargs]]
                        fixed_nodes.append([[keras_history[0], keras_history[1], keras_history[2], clean_kwargs]])
                    else:
                        fixed_nodes.append([])
                
                # Multiple inputs (for Add, Concatenate, etc.)
                elif isinstance(first_arg, list):
                    inputs = []
                    for item in first_arg:
                        if isinstance(item, dict) and item.get('class_name') == '__keras_tensor__':
                            keras_history = item.get('config', {}).get('keras_history', [])
                            if keras_history:
                                inputs.append([keras_history[0], keras_history[1], keras_history[2], {}])
                    if inputs:
                        fixed_nodes.append(inputs)
                    else:
                        fixed_nodes.append([])
                else:
                    fixed_nodes.append([])
            else:
                fixed_nodes.append([])
        elif isinstance(node, list):
            # Already in array format
            fixed_nodes.append(node)
        else:
            fixed_nodes.append([])
    
    return fixed_nodes

def fix_layer_refs(refs):
    """Fix input_layers and output_layers references"""
    if not refs:
        return refs
    
    fixed = []
    for ref in refs:
        if isinstance(ref, list) and len(ref) >= 3:
            fixed.append(ref[:3])  # [layer_name, node_index, tensor_index]
        else:
            fixed.append(ref)
    return fixed

if __name__ == '__main__':
    # First, restore original from result folder
    import shutil
    print("Restoring original model.json from result folder...")
    shutil.copy('result/model.json', 'docs/model/model.json')
    
    # Then convert
    convert_keras3_to_tfjs('docs/model/model.json', 'docs/model/model.json')
    
    # Verify
    with open('docs/model/model.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    topology = data.get('modelTopology', {}).get('model_config', {}).get('config', {})
    layers = topology.get('layers', [])
    
    if layers:
        first_layer = layers[0]
        config = first_layer.get('config', {})
        print(f"\nVerification - First layer config keys: {list(config.keys())}")
        if 'batchInputShape' in config:
            print(f"✅ batchInputShape found: {config['batchInputShape']}")
        if 'batch_shape' in config:
            print(f"❌ batch_shape still present!")
