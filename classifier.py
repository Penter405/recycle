import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions
from tensorflow.keras.preprocessing import image
import numpy as np
import cv2

class Classifier:
    def __init__(self):
        # Load the pre-trained MobileNetV2 model
        print("Loading MobileNetV2 model...")
        self.model = MobileNetV2(weights='imagenet')
        print("Model loaded.")
        
        # Define target labels that we consider as "Bottle" or "Recyclable"
        # Reference: ImageNet labels
        self.target_labels = [
            'water_bottle', 
            'pop_bottle', 
            'beer_bottle', 
            'wine_bottle', 
            'pill_bottle', 
            'milk_can', 
            'can',
            'carton', # Paper carton
            'packet', # Juice packet
        ]

    def predict(self, frame):
        """
        Takes an OpenCV frame (BGR), preprocesses it, and returns the prediction result.
        """
        # Resize frame to 224x224 as required by MobileNetV2
        img = cv2.resize(frame, (224, 224))
        
        # Convert BGR (OpenCV) to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Expand dimensions to match model input shape (1, 224, 224, 3)
        x = np.expand_dims(img, axis=0)
        
        # Preprocess input (scaling, etc.)
        x = preprocess_input(x)
        
        # Make prediction
        preds = self.model.predict(x, verbose=0)
        
        # Decode predictions (Top 3)
        decoded_preds = decode_predictions(preds, top=3)[0]
        # decoded_preds structure: list of tuples (class_id, class_name, score)
        
        # Check if the top prediction is in our target list
        top_pred = decoded_preds[0]
        label = top_pred[1]
        score = top_pred[2]
        
        result = {
            "label": label,
            "score": float(score),
            "is_recyclable": False,
            "display_text": f"Other ({label}: {score:.2f})"
        }
        
        # Lower threshold to 0.3 for better detection of cartons/bottles in wild
        if label in self.target_labels and score > 0.3: 
            result["is_recyclable"] = True
            result["display_text"] = f"RECYCLABLE: {label} ({score:.2f})"
        else:
             # Check if any of the top 3 is a bottle with high confidence if top 1 wasn't
             for pred in decoded_preds:
                 if pred[1] in self.target_labels and pred[2] > 0.3:
                     # Relaxed threshold if it's in top 3 but maybe not #1 (e.g. partial occlusion)
                     # But for safety, let's stick to top 1 for now or be more robust.
                     # Let's keep it simple: Top 1 matching.
                     pass

        return result
