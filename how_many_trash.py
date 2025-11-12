"""
this is all made by Gemini on google colab
"""
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import matplotlib.font_manager as fm
import os
import shutil

# --- 1. Load Data ---
# Load the dataset
df = pd.read_csv('/Preview_Data.csv')

# --- 2. Preprocess Data ---
# Preprocess 'item1' column (Minguo calendar to datetime)
df['item1'] = df['item1'].str.replace('年', '').str.replace('月', '')

def minguo_to_ad(minguo_date_str):
    try:
        year, month = map(int, minguo_date_str.split())
        ad_year = year + 1911
        return f"{ad_year}-{month:02d}-01"
    except ValueError:
        return None

df['item1'] = df['item1'].apply(minguo_to_ad)
df['item1'] = pd.to_datetime(df['item1'], errors='coerce')

# --- NEW: Drop rows with NaT in 'item1' to fix discontinuities ---
df.dropna(subset=['item1'], inplace=True)
print("已移除 'item1' 欄位中包含無效日期 (NaT) 的行。")

# Convert value columns to numeric, handling errors and filling NaNs
int_value_cols = ['value1', 'value2', 'value3', 'value4']
float_value_cols = ['value5']

for col in int_value_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')
    df[col] = df[col].fillna(0).astype(int)

for col in float_value_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce')
    df[col] = df[col].fillna(0.0).astype(float) # Changed to float

# --- 3. Configure Matplotlib for Chinese Display ---
# Install CJK font (Noto Sans CJK)
!apt-get -qq install fonts-noto-cjk

# Remove Matplotlib's font cache directory directly using shell command
# This forces Matplotlib to rebuild its font cache upon next use.
!rm -rf ~/.cache/matplotlib

# Re-import matplotlib modules to force them to re-initialize and discover new fonts
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# Find the actual installed Noto Sans CJK font file path
noto_font_path = None
possible_paths = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', # Common path in Colab
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf',
    '/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf',
    '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
]

for path in possible_paths:
    if os.path.exists(path):
        noto_font_path = path
        break

if noto_font_path:
    fm.fontManager.addfont(noto_font_path)
    font_properties = fm.FontProperties(fname=noto_font_path)
    noto_cjk_name = font_properties.get_name()
    plt.rcParams['font.sans-serif'] = [noto_cjk_name]
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['axes.unicode_minus'] = False
    print(f"Configured Matplotlib to use '{noto_cjk_name}' from path '{noto_font_path}' as primary sans-serif font.")
else:
    print("Warning: Noto Sans CJK font file not found on system. Falling back to generic sans-serif.")
    plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial Unicode MS', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji']
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['axes.unicode_minus'] = False

# --- 4. Generate Localized Line Plot ---
plt.figure(figsize=(15, 8))

# Create a primary Y-axis for value1-value4
ax1 = plt.gca()

# Plot value1 to value4 on ax1 with Chinese labels
ax1.plot(df['item1'], df['value1'], label='總產生量', color='blue')
ax1.plot(df['item1'], df['value2'], label='一般垃圾量', color='red')
ax1.plot(df['item1'], df['value3'], label='資源垃圾量', color='green')
ax1.plot(df['item1'], df['value4'], label='廚餘量', color='purple')
ax1.set_ylabel('數量 (噸/月)', color='black')
ax1.tick_params(axis='y', labelcolor='black')

# Create a secondary Y-axis for value5
ax2 = ax1.twinx()
ax2.plot(df['item1'], df['value5'], label='平均每人每日一般廢棄物產生量', color='orange', linestyle='--')
ax2.set_ylabel('數量 / 每人 (公斤/日)', color='orange')
ax2.tick_params(axis='y', labelcolor='orange')

# Add title and x-axis label with Chinese labels
plt.title('廢棄物產生量趨勢分析')
ax1.set_xlabel('統計期 (年-月)')

# Combine legends from both axes
lines, labels = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax2.legend(lines + lines2, labels + labels2, loc='upper left')

plt.grid(True)
plt.tight_layout()
plt.savefig('waste_generation_trends_chinese.png')
plt.show()

print("已生成並保存折線圖為 'waste_generation_trends_chinese.png'.")