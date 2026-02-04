"""
SmartRecycle AI - TrashNet 資料集下載與整理腳本
下載 TrashNet 資料集並映射到我們的 6 個類別

TrashNet 類別 → 我們的類別:
- glass     → garbage (垃圾)
- paper     → paper (紙類)
- cardboard → paper (紙類)
- plastic   → plastic (塑膠類)
- metal     → metal_can (鐵鋁罐)
- trash     → garbage (垃圾)

缺少的類別 (需手動拍攝):
- paper_container (紙餐盒)
- tetra_pak (鋁箔包)

使用方式:
    python collect_data.py
"""

import os
import shutil
import zipfile
import requests
from pathlib import Path
from PIL import Image

# ===== 設定 =====
TRAIN_DIR = Path(__file__).parent / "train"
TEMP_DIR = Path(__file__).parent / "temp_trashnet"
IMAGE_SIZE = (224, 224)

# TrashNet GitHub 下載連結
TRASHNET_URL = "https://github.com/garythung/trashnet/raw/master/data/dataset-resized.zip"

# 類別映射: TrashNet → 我們的類別
CATEGORY_MAPPING = {
    "glass": "garbage",        # 玻璃 → 垃圾 (台灣玻璃另外回收，這裡先歸類)
    "paper": "paper",          # 紙張 → 紙類
    "cardboard": "paper",      # 紙板 → 紙類
    "plastic": "plastic",      # 塑膠 → 塑膠類
    "metal": "metal_can",      # 金屬 → 鐵鋁罐
    "trash": "garbage",        # 一般垃圾 → 垃圾
}

# 每個類別最多取多少張
MAX_PER_SOURCE = 80


def download_trashnet():
    """下載 TrashNet 資料集"""
    zip_path = TEMP_DIR / "trashnet.zip"
    
    if zip_path.exists():
        print("  ✓ 已有下載的 ZIP 檔案")
        return zip_path
    
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    
    print("  📥 正在下載 TrashNet 資料集...")
    print(f"     URL: {TRASHNET_URL}")
    
    try:
        response = requests.get(TRASHNET_URL, stream=True, timeout=120)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    progress = downloaded / total_size * 100
                    print(f"     下載進度: {progress:.1f}%", end="\r")
        
        print(f"\n  ✅ 下載完成: {zip_path}")
        return zip_path
        
    except Exception as e:
        print(f"  ❌ 下載失敗: {e}")
        return None


def extract_and_organize():
    """解壓縮並整理資料"""
    zip_path = TEMP_DIR / "trashnet.zip"
    extract_dir = TEMP_DIR / "extracted"
    
    if not zip_path.exists():
        print("  ❌ 找不到 ZIP 檔案")
        return False
    
    # 解壓縮
    print("  📦 正在解壓縮...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    
    # 找到實際的資料目錄
    data_dir = None
    for root, dirs, files in os.walk(extract_dir):
        if any(cat in dirs for cat in CATEGORY_MAPPING.keys()):
            data_dir = Path(root)
            break
    
    if not data_dir:
        print("  ❌ 找不到資料目錄")
        return False
    
    print(f"  📂 資料目錄: {data_dir}")
    
    # 建立目標目錄
    for target_cat in set(CATEGORY_MAPPING.values()):
        (TRAIN_DIR / target_cat).mkdir(parents=True, exist_ok=True)
    
    # 複製並調整圖片
    stats = {}
    
    for source_cat, target_cat in CATEGORY_MAPPING.items():
        source_dir = data_dir / source_cat
        target_dir = TRAIN_DIR / target_cat
        
        if not source_dir.exists():
            print(f"  ⚠ 找不到來源類別: {source_cat}")
            continue
        
        images = list(source_dir.glob("*.jpg")) + list(source_dir.glob("*.jpeg")) + list(source_dir.glob("*.png"))
        count = 0
        
        print(f"\n  📁 {source_cat} → {target_cat} ({len(images)} 張)")
        
        for img_path in images[:MAX_PER_SOURCE]:
            try:
                # 載入並調整大小
                img = Image.open(img_path)
                if img.mode != "RGB":
                    img = img.convert("RGB")
                img = img.resize(IMAGE_SIZE, Image.LANCZOS)
                
                # 新檔名 (加上來源類別前綴避免覆蓋)
                new_name = f"{source_cat}_{img_path.name}"
                if not new_name.endswith('.jpg'):
                    new_name = new_name.rsplit('.', 1)[0] + '.jpg'
                
                target_path = target_dir / new_name
                
                if not target_path.exists():
                    img.save(target_path, "JPEG", quality=90)
                    count += 1
                    print(f"    複製 {count}", end="\r")
                    
            except Exception as e:
                pass
        
        stats[f"{source_cat}→{target_cat}"] = count
        print(f"    ✅ 複製了 {count} 張")
    
    return True


def create_missing_folders():
    """建立缺少的類別資料夾"""
    missing = ["paper_container", "tetra_pak"]
    
    for cat in missing:
        folder = TRAIN_DIR / cat
        folder.mkdir(parents=True, exist_ok=True)
        
        # 建立說明檔案
        readme = folder / "README.txt"
        if not readme.exists():
            with open(readme, "w", encoding="utf-8") as f:
                if cat == "paper_container":
                    f.write("紙餐盒 (Paper Food Container)\n")
                    f.write("="*40 + "\n\n")
                    f.write("請手動添加以下類型的圖片:\n")
                    f.write("- 紙便當盒\n")
                    f.write("- 紙杯 (咖啡杯、飲料杯)\n")
                    f.write("- 紙碗\n")
                    f.write("- 紙餐具\n\n")
                    f.write("拍攝建議:\n")
                    f.write("- 單一物品\n")
                    f.write("- 乾淨背景 (白色或淺色最佳)\n")
                    f.write("- 多角度拍攝\n")
                else:
                    f.write("鋁箔包 (Tetra Pak)\n")
                    f.write("="*40 + "\n\n")
                    f.write("請手動添加以下類型的圖片:\n")
                    f.write("- 利樂包飲料盒\n")
                    f.write("- 鋁箔包裝飲料\n")
                    f.write("- 牛奶盒\n")
                    f.write("- 果汁盒\n\n")
                    f.write("拍攝建議:\n")
                    f.write("- 單一物品\n")
                    f.write("- 乾淨背景 (白色或淺色最佳)\n")
                    f.write("- 多角度拍攝\n")


def count_images():
    """統計各類別圖片數量"""
    print("\n" + "="*60)
    print("📊 訓練資料統計")
    print("="*60)
    
    categories = ["garbage", "paper", "paper_container", "tetra_pak", "metal_can", "plastic"]
    total = 0
    
    for cat in categories:
        folder = TRAIN_DIR / cat
        if folder.exists():
            count = len([f for f in folder.glob("*.jpg")])
            status = "✅" if count >= 30 else "⚠️ 需補充" if count > 0 else "❌ 空"
            print(f"  {status} {cat}: {count} 張")
            total += count
        else:
            print(f"  ❌ {cat}: 資料夾不存在")
    
    print(f"\n  總計: {total} 張")
    return total


def cleanup():
    """清理暫存檔案"""
    if TEMP_DIR.exists():
        print("\n  🧹 清理暫存檔案...")
        shutil.rmtree(TEMP_DIR)
        print("  ✅ 清理完成")


def main():
    print("="*60)
    print("🗑️  SmartRecycle AI - TrashNet 資料集下載工具")
    print("="*60)
    
    # 1. 下載 TrashNet
    print("\n📥 步驟 1: 下載 TrashNet 資料集")
    zip_path = download_trashnet()
    
    if not zip_path:
        print("❌ 下載失敗，請檢查網路連線")
        return
    
    # 2. 解壓縮並整理
    print("\n📦 步驟 2: 解壓縮並整理資料")
    if not extract_and_organize():
        print("❌ 整理失敗")
        return
    
    # 3. 建立缺少的資料夾
    print("\n📁 步驟 3: 建立缺少的類別資料夾")
    create_missing_folders()
    print("  ✅ 已建立 paper_container 和 tetra_pak 資料夾")
    
    # 4. 統計
    count_images()
    
    # 5. 清理
    cleanup()
    
    # 6. 提示
    print("\n" + "="*60)
    print("💡 下一步")
    print("="*60)
    print("\n需要手動補充的類別:")
    print("  📷 paper_container (紙餐盒) - 請拍攝紙便當盒、紙杯等")
    print("  📷 tetra_pak (鋁箔包) - 請拍攝利樂包、鋁箔飲料盒等")
    print("\n拍攝建議:")
    print("  - 單一物品、乾淨背景")
    print("  - 每類至少 30-50 張")
    print("  - 多角度、不同光線")
    print(f"\n圖片請放到: {TRAIN_DIR}")


if __name__ == "__main__":
    main()
