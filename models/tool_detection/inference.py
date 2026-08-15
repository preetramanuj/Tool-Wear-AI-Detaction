import cv2
import torch
from ultralytics import YOLO
import sys

def run_inference(image_path, model_path):
    # Load model
    model = YOLO(model_path)
    
    # Run inference
    results = model(image_path)
    
    # Process results
    for result in results:
        boxes = result.boxes
        for box in boxes:
            # Get coordinates and confidence
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = box.conf[0].item()
            print(f'Detected Tool at [{x1:.1f}, {y1:.1f}, {x2:.1f}, {y2:.1f}] with confidence {conf:.2f}')
            
        # Optional: Save result
        result.save(filename='detection_result.jpg')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python inference.py <image_path> <model_path>')
    else:
        run_inference(sys.argv[1], sys.argv[2])