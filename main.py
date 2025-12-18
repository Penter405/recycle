import cv2
import time
import sys
import os
from classifier import Classifier

def main():
    # Initialize Classifier
    classifier = Classifier()
    
    # Check for image argument
    image_path = None
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    
    cap = None
    frame = None
    mode = "camera"

    if image_path:
        mode = "image"
        if not os.path.exists(image_path):
             print(f"Error: File {image_path} not found.")
             return
        frame = cv2.imread(image_path)
    else:
        # Initialize Camera
        # Use CAP_DSHOW for better Windows compatibility
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print("Error: Could not open video capture.")
            print("Trying fallback to 'test_bottle.jpg' if exists...")
            if os.path.exists("test_bottle.jpg"):
                mode = "image"
                image_path = "test_bottle.jpg"
                frame = cv2.imread(image_path)
            else:
                print("No camera and no 'test_bottle.jpg'. Exiting.")
                return

    print("Start... Press 'q' to exit.")
    
    # Fonts and colors
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    last_pred_time = 0
    current_result = None
    
    while True:
        if mode == "camera":
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to capture frame.")
                break
        
        # In image mode, we just keep the same frame
        # If image mode, predict once then just display
        if mode == "image" and current_result is None:
             current_result = classifier.predict(frame)
        elif mode == "camera":
            current_time = time.time()
            if current_time - last_pred_time > 0.2: 
                current_result = classifier.predict(frame)
                last_pred_time = current_time
            
        display_frame = frame.copy()
        
        # Draw result on display_frame
        if current_result:
            text = current_result["display_text"]
            color = (0, 255, 0) if current_result["is_recyclable"] else (0, 0, 255)
            
            # Put text with background for better visibility
            cv2.putText(display_frame, text, (10, 50), font, 1.0, (0, 0, 0), 4, cv2.LINE_AA) 
            cv2.putText(display_frame, text, (10, 50), font, 1.0, color, 2, cv2.LINE_AA)
            
            if mode == "image":
                 cv2.putText(display_frame, "(Test Image Mode)", (10, 90), font, 0.7, (255, 255, 0), 2, cv2.LINE_AA)

        cv2.imshow('Trash Classifier - Press q to exit', display_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    if cap:
        cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
