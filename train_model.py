"""
SmartRecycle AI - MobileNetV2 Transfer Learning 訓練腳本
訓練 5 類別的垃圾分類模型並匯出為 TensorFlow.js 格式

類別:
1. garbage (垃圾)
2. paper (紙類)
3. paper_container (紙餐盒)
4. metal_can (鐵鋁罐)
5. plastic (塑膠類)

使用方式:
    python train_model.py

依賴套件:
    pip install tensorflow tensorflowjs Pillow
"""

import os
import json
import shutil
from pathlib import Path

import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

# ===== 設定 =====
TRAIN_DIR = Path(__file__).parent / "train"
MODEL_DIR = Path(__file__).parent / "docs" / "model"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 20

# 類別名稱 (順序很重要！)
CATEGORIES = ["garbage", "metal_can", "paper", "paper_container", "plastic"]


def prepare_data():
    """準備訓練資料"""
    print("\n📊 準備訓練資料...")
    
    # 檢查資料夾
    for cat in CATEGORIES:
        cat_dir = TRAIN_DIR / cat
        if not cat_dir.exists():
            print(f"  ⚠️ 找不到資料夾: {cat}")
            continue
        count = len(list(cat_dir.glob("*.jpg")))
        print(f"  📁 {cat}: {count} 張")
    
    # 資料增強
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=0.2  # 20% 用於驗證
    )
    
    # 訓練資料
    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CATEGORIES,
        subset='training',
        shuffle=True
    )
    
    # 驗證資料
    val_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CATEGORIES,
        subset='validation',
        shuffle=False
    )
    
    print(f"\n  訓練樣本: {train_generator.samples}")
    print(f"  驗證樣本: {val_generator.samples}")
    print(f"  類別對應: {train_generator.class_indices}")
    
    return train_generator, val_generator


def build_model(num_classes):
    """建立 MobileNetV2 Transfer Learning 模型"""
    print("\n🏗️ 建立模型...")
    
    # 載入預訓練的 MobileNetV2 (不含頂層)
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3)
    )
    
    # 凍結基礎模型的權重
    base_model.trainable = False
    
    # 建立新的頂層
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.3)(x)
    predictions = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    # 編譯模型
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"  總參數: {model.count_params():,}")
    print(f"  可訓練參數: {sum(tf.keras.backend.count_params(w) for w in model.trainable_weights):,}")
    
    return model


def train_model(model, train_gen, val_gen):
    """訓練模型"""
    print("\n🚀 開始訓練...")
    
    # 回呼函式
    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            'best_model.keras',
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]
    
    # 訓練
    history = model.fit(
        train_gen,
        epochs=EPOCHS,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1
    )
    
    return history


def export_to_tfjs(model):
    """匯出為 TensorFlow.js 格式"""
    print("\n📦 匯出為 TensorFlow.js 格式...")
    
    # 確保目錄存在
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # 先儲存 Keras 模型
    keras_path = MODEL_DIR / "model.keras"
    model.save(keras_path)
    print(f"  ✅ Keras 模型已儲存: {keras_path}")
    
    # 使用 tensorflowjs_converter 轉換
    try:
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(model, str(MODEL_DIR))
        print(f"  ✅ TensorFlow.js 模型已匯出: {MODEL_DIR}")
    except Exception as e:
        print(f"  ⚠️ TensorFlow.js 匯出失敗: {e}")
        print("  請手動執行:")
        print(f"  tensorflowjs_converter --input_format=keras {keras_path} {MODEL_DIR}")
    
    # 儲存類別標籤
    labels_path = MODEL_DIR / "labels.json"
    with open(labels_path, 'w', encoding='utf-8') as f:
        json.dump(CATEGORIES, f, ensure_ascii=False, indent=2)
    print(f"  ✅ 類別標籤已儲存: {labels_path}")


def main():
    print("="*60)
    print("🗑️ SmartRecycle AI - 模型訓練")
    print("="*60)
    
    # 1. 準備資料
    train_gen, val_gen = prepare_data()
    
    # 2. 建立模型
    model = build_model(num_classes=len(CATEGORIES))
    
    # 3. 訓練模型
    history = train_model(model, train_gen, val_gen)
    
    # 4. 評估
    print("\n📈 訓練結果:")
    final_acc = history.history['accuracy'][-1]
    final_val_acc = history.history['val_accuracy'][-1]
    print(f"  訓練準確率: {final_acc:.2%}")
    print(f"  驗證準確率: {final_val_acc:.2%}")
    
    # 5. 匯出
    export_to_tfjs(model)
    
    # 6. 清理暫存
    if os.path.exists('best_model.keras'):
        os.remove('best_model.keras')
    
    print("\n" + "="*60)
    print("✅ 訓練完成！")
    print("="*60)
    print(f"\n模型已匯出至: {MODEL_DIR}")
    print("\n下一步:")
    print("1. 更新 docs/config.js 中的 MODEL.IS_CUSTOM_MODEL = true")
    print("2. 部署到 GitHub Pages")


if __name__ == "__main__":
    main()
