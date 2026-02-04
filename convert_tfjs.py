"""
TensorFlow.js 模型轉換腳本
"""
import os
import sys

# 設定路徑
MODEL_PATH = os.path.abspath("docs/model/model.h5")
OUTPUT_PATH = os.path.abspath("docs/model/tfjs")

print(f"模型路徑: {MODEL_PATH}")
print(f"輸出路徑: {OUTPUT_PATH}")
print(f"模型存在: {os.path.exists(MODEL_PATH)}")

# 確保輸出目錄存在
os.makedirs(OUTPUT_PATH, exist_ok=True)

try:
    import tensorflow as tf
    print(f"TensorFlow 版本: {tf.__version__}")
    
    print("\n載入模型...")
    model = tf.keras.models.load_model(MODEL_PATH)
    print("模型載入成功!")
    model.summary()
    
    import tensorflowjs as tfjs
    print(f"\nTensorFlow.js 版本: {tfjs.__version__}")
    
    print(f"\n轉換模型到 {OUTPUT_PATH}...")
    tfjs.converters.save_keras_model(model, OUTPUT_PATH)
    
    print("\n✅ 轉換完成!")
    print("輸出檔案:")
    for f in os.listdir(OUTPUT_PATH):
        fpath = os.path.join(OUTPUT_PATH, f)
        size = os.path.getsize(fpath)
        print(f"  - {f} ({size:,} bytes)")
        
except Exception as e:
    print(f"\n❌ 錯誤: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
