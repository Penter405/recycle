"""
WSL 訓練腳本 - 使用 TensorFlow 2.10 訓練並匯出 TFJS 格式
在 WSL 中執行此腳本

安裝步驟:
    cd /mnt/c/Users/ba/OneDrive/桌面/04
    python3 -m venv venv
    source venv/bin/activate
    pip install tensorflow==2.10.0 tensorflowjs pillow

執行:
    python train_wsl.py
"""

import os
import json
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # 減少警告

import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping

print(f"TensorFlow: {tf.__version__}")

# 設定
TRAIN_DIR = "train"
MODEL_DIR = "docs/model"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 15

# 類別 (順序要與 config.js 一致)
CATEGORIES = ["garbage", "metal_can", "paper", "paper_container", "plastic"]

def main():
    print("\n" + "="*50)
    print("🗑️ SmartRecycle - WSL 訓練")
    print("="*50)
    
    # 檢查資料
    print("\n📊 檢查訓練資料...")
    for cat in CATEGORIES:
        path = os.path.join(TRAIN_DIR, cat)
        if os.path.exists(path):
            count = len([f for f in os.listdir(path) if f.endswith('.jpg')])
            print(f"  {cat}: {count} 張")
        else:
            print(f"  ⚠️ {cat}: 找不到資料夾")
    
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
        TRAIN_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CATEGORIES,
        subset='training'
    )
    
    val_gen = datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CATEGORIES,
        subset='validation'
    )
    
    print(f"\n  訓練: {train_gen.samples}, 驗證: {val_gen.samples}")
    
    # 建立模型
    print("\n🏗️ 建立模型...")
    base = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224,224,3))
    base.trainable = False
    
    x = base.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.3)(x)
    outputs = Dense(len(CATEGORIES), activation='softmax')(x)
    
    model = Model(inputs=base.input, outputs=outputs)
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # 訓練
    print("\n🚀 開始訓練...")
    history = model.fit(
        train_gen,
        epochs=EPOCHS,
        validation_data=val_gen,
        callbacks=[EarlyStopping(patience=3, restore_best_weights=True)],
        verbose=1
    )
    
    print(f"\n📈 最終準確率: {history.history['val_accuracy'][-1]:.2%}")
    
    # 匯出 TFJS
    print("\n📦 匯出 TensorFlow.js...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, MODEL_DIR)
    print(f"  ✅ 模型已匯出至 {MODEL_DIR}")
    
    # 儲存標籤
    with open(os.path.join(MODEL_DIR, "labels.json"), 'w') as f:
        json.dump(CATEGORIES, f, indent=2)
    
    print("\n" + "="*50)
    print("✅ 完成！")
    print("="*50)

if __name__ == "__main__":
    main()
