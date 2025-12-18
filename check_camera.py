import cv2

def check_cameras():
    available_cameras = []
    print("Checking camera indices 0 to 4 using CAP_DSHOW...")
    for index in range(5):
        # cv2.CAP_DSHOW is recommended for Windows
        cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print(f"[SUCCESS] Camera found and readable at index: {index}")
                available_cameras.append(index)
            else:
                print(f"[WARNING] Camera opened at index {index} but failed to read frame.")
            cap.release()
        else:
            print(f"No camera at index: {index}")
    
    if available_cameras:
        print(f"\nAvailable cameras: {available_cameras}")
    else:
        print("\nNo cameras detected.")

if __name__ == "__main__":
    check_cameras()
