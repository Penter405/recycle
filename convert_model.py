"""
將 Keras 模型轉換為 TensorFlow.js 格式
使用 Layers model 格式
"""
import tensorflow as tf
import os
import json
import shutil

MODEL_PATH = "docs/model/model.keras"
OUTPUT_PATH = "docs/model"

print("載入模型...")
model = tf.keras.models.load_model(MODEL_PATH)

print("模型摘要:")
model.summary()

# 嘗試使用 H5 格式作為中間格式
h5_path = os.path.join(OUTPUT_PATH, "model.h5")
print(f"\n儲存為 H5 格式: {h5_path}")
model.save(h5_path, save_format='h5')

print("\n現在請手動執行以下命令進行轉換:")
print(f"  tensorflowjs_converter --input_format=keras_saved_model {h5_path} {OUTPUT_PATH}")

# 或者嘗試直接使用 tfjs 儲存
try:
    import tensorflowjs as tfjs
    print("\n嘗試使用 tensorflowjs 直接儲存...")
    tfjs.converters.save_keras_model(model, OUTPUT_PATH)
    print("✅ 成功!")
except Exception as e:
    print(f"❌ 失敗: {e}")
    print("\n替代方案:")
    print("1. 你可以使用線上轉換工具: https://www.tensorflow.org/js/tutorials/conversion/import_keras")
    print(f"2. 或者上傳 {h5_path} 到線上轉換器")
    print("\n模型已儲存為 H5 格式，可供線上轉換使用。")

# 建立類別索引檔案
labels = ["garbage", "metal_can", "paper", "paper_container", "plastic"]
with open(os.path.join(OUTPUT_PATH, "labels.json"), 'w') as f:
    json.dump(labels, f)

print(f"\n類別標籤已儲存至 {OUTPUT_PATH}/labels.json")
print(f"類別: {labels}")
