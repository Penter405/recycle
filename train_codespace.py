"""
GitHub Codespaces 訓練腳本
使用 TensorFlow 2.16 + tf-keras (Keras 2 相容) 輸出 TFJS 格式

安裝依賴:
    pip install tensorflow==2.16.2 tf-keras tensorflowjs pillow

執行:
    python train_codespace.py
"""

import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'  # 使用 Keras 2 API
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import json
import tf_keras as keras
from tf_keras.applications import MobileNetV2
from tf_keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tf_keras.models import Model
from tf_keras.preprocessing.image import ImageDataGenerator

print(f"Keras version: {keras.__version__}")

# 設定
TRAIN_DIR = "train"
MODEL_DIR = "docs/model"
CATEGORIES = ["garbage", "metal_can", "paper", "paper_container", "plastic"]

def main():
    print("\n" + "="*50)
    print("🗑️ SmartRecycle - Codespaces 訓練")
    print("="*50)
    
    # 檢查資料
    print("\n📊 檢查訓練資料...")
    for cat in CATEGORIES:
        path = os.path.join(TRAIN_DIR, cat)
        if os.path.exists(path):
            count = len([f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
            print(f"  {cat}: {count} 張")
    
    # 資料增強
    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2
    )
    
    train_gen = datagen.flow_from_directory(
        TRAIN_DIR, target_size=(224, 224), batch_size=16,
        class_mode='categorical', classes=CATEGORIES, subset='training'
    )
    
    val_gen = datagen.flow_from_directory(
        TRAIN_DIR, target_size=(224, 224), batch_size=16,
        class_mode='categorical', classes=CATEGORIES, subset='validation'
    )
    
    print(f"\n  訓練: {train_gen.samples}, 驗證: {val_gen.samples}")
    
    # 建立模型
    print("\n🏗️ 建立模型...")
    base = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    base.trainable = False
    
    x = GlobalAveragePooling2D()(base.output)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.3)(x)
    outputs = Dense(len(CATEGORIES), activation='softmax')(x)
    
    model = Model(inputs=base.input, outputs=outputs)
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    
    # 訓練
    print("\n🚀 開始訓練...")
    history = model.fit(train_gen, epochs=10, validation_data=val_gen, verbose=1)
    
    print(f"\n📈 最終驗證準確率: {history.history['val_accuracy'][-1]:.2%}")
    
    # 先儲存 H5 格式
    print("\n📦 儲存模型...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    h5_path = os.path.join(MODEL_DIR, "model.h5")
    model.save(h5_path)
    print(f"  ✅ H5 模型已儲存: {h5_path}")
    
    # 匯出 TFJS (使用命令行)
    print("\n📦 轉換為 TensorFlow.js...")
    import subprocess
    result = subprocess.run([
        'tensorflowjs_converter',
        '--input_format=keras',
        h5_path,
        MODEL_DIR
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"  ⚠️ 轉換輸出: {result.stderr}")
    
    # 修復 model.json 相容性
    print("\n🔧 修復 model.json 相容性...")
    model_json_path = os.path.join(MODEL_DIR, "model.json")
    if os.path.exists(model_json_path):
        with open(model_json_path, 'r') as f:
            data = json.load(f)
        
        # 修復 InputLayer
        def fix_layer(layer):
            cfg = layer.get('config', {})
            if layer.get('class_name') == 'InputLayer':
                if 'batch_shape' in cfg:
                    cfg['batchInputShape'] = cfg.pop('batch_shape')
            if 'dtype' in cfg and isinstance(cfg['dtype'], dict):
                cfg['dtype'] = cfg['dtype'].get('config', {}).get('name', 'float32')
            for key in ['kernel_initializer', 'bias_initializer', 'depthwise_initializer']:
                if key in cfg and isinstance(cfg[key], dict):
                    for rm in ['module', 'registered_name']:
                        cfg[key].pop(rm, None)
        
        def fix_nodes(nodes):
            fixed = []
            for node in nodes:
                if isinstance(node, dict) and 'args' in node:
                    args = node.get('args', [])
                    if args and isinstance(args[0], dict):
                        h = args[0].get('config', {}).get('keras_history', [])
                        if h:
                            fixed.append([[h[0], h[1], h[2], {}]])
                        else:
                            fixed.append([])
                    elif args and isinstance(args[0], list):
                        inputs = []
                        for item in args[0]:
                            if isinstance(item, dict):
                                h = item.get('config', {}).get('keras_history', [])
                                if h:
                                    inputs.append([h[0], h[1], h[2], {}])
                        fixed.append(inputs if inputs else [])
                    else:
                        fixed.append([])
                else:
                    fixed.append(node if isinstance(node, list) else [])
            return fixed
        
        topology = data.get('modelTopology', {}).get('model_config', {}).get('config', {})
        for layer in topology.get('layers', []):
            fix_layer(layer)
            if 'inbound_nodes' in layer:
                layer['inbound_nodes'] = fix_nodes(layer['inbound_nodes'])
        
        with open(model_json_path, 'w') as f:
            json.dump(data, f, separators=(',', ':'))
        print("  ✅ model.json 已修復")
    
    # 儲存標籤
    with open(os.path.join(MODEL_DIR, "labels.json"), 'w') as f:
        json.dump(CATEGORIES, f, indent=2)
    
    # 清理 H5
    os.remove(h5_path)
    
    print(f"\n✅ 模型已匯出至 {MODEL_DIR}/")
    print("\n下一步: git add, commit, push 到 GitHub Pages")

if __name__ == "__main__":
    main()
