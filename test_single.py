import cv2
import sys
from classifier import Classifier

def test():
    if len(sys.argv) < 2:
        print("Usage: python test_single.py <image_path>")
        return

    path = sys.argv[1]
    print(f"Testing image: {path}")
    
    img = cv2.imread(path)
    if img is None:
        print("Error: Read image failed.")
        return

    c = Classifier()
    res = c.predict(img)
    print("Optimization Result:")
    print(res)

if __name__ == "__main__":
    test()
