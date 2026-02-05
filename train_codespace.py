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
    
    # 匯出 TFJS
    print("\n📦 匯出 TensorFlow.js...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, MODEL_DIR)
    
    # 儲存標籤
    with open(os.path.join(MODEL_DIR, "labels.json"), 'w') as f:
        json.dump(CATEGORIES, f, indent=2)
    
    print(f"\n✅ 模型已匯出至 {MODEL_DIR}/")
    print("\n下一步: git add, commit, push 到 GitHub Pages")

if __name__ == "__main__":
    main()
