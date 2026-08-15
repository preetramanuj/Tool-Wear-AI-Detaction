#!/usr/bin/env python3
"""
ToolGuard AI - Model Testing & Diagnostic CLI
Loads and tests the PyTorch (.pt) cutting tool detection model stored in result/.

Usage:
    python backend/test_model.py
    python backend/test_model.py --image path/to/image.jpg
    python backend/test_model.py --model result/tool_detection/yolo11_matwi_10epochs/weights/best.pt --conf 0.25
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from typing import Tuple, Optional
import numpy as np
import cv2


# Add workspace root to sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.services.tool_detection_service import ToolDetectionService
from backend.utils.model_loader import find_model_weights

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TestModel")


def create_synthetic_machining_image(width=640, height=640) -> np.ndarray:
    """
    Generate a high-contrast synthetic CNC machining test image with cutting insert geometry.
    """
    # Background: dark industrial spindle housing with radial gradient
    img = np.zeros((height, width, 3), dtype=np.uint8)
    for r in range(height):
        intensity = int(35 + 25 * (r / height))
        img[r, :] = (intensity, intensity, intensity + 5)

    # Draw spindle arbor / tool holder
    cv2.rectangle(img, (220, 0), (420, 260), (70, 75, 80), -1)
    cv2.rectangle(img, (240, 260), (400, 340), (90, 95, 100), -1)

    # Draw golden TiN-coated cutting tool insert tip (Target Bounding Box ~ [260, 330, 380, 460])
    insert_pts = np.array([
        [270, 340],
        [370, 340],
        [390, 430],
        [320, 470],
        [250, 430]
    ], np.int32)
    cv2.fillPoly(img, [insert_pts], (20, 160, 210))  # Golden TiN tint in BGR
    cv2.polylines(img, [insert_pts], True, (10, 120, 170), 2)

    # Draw insert mounting screw hole in center
    cv2.circle(img, (320, 390), 16, (40, 45, 50), -1)
    cv2.circle(img, (320, 390), 16, (120, 125, 130), 1)

    # Add industrial workpiece in background
    cv2.rectangle(img, (80, 510), (560, 620), (55, 60, 65), -1)
    cv2.line(img, (80, 510), (560, 510), (140, 140, 150), 2)

    return img


def find_sample_test_image(requested_path: Optional[str] = None) -> Tuple[np.ndarray, str]:
    """
    Search for an available real test image in the workspace or generate synthetic.
    """
    if requested_path:
        if requested_path.lower() == "synthetic":
            return create_synthetic_machining_image(), "Synthetic CNC Machining Sample"
        if os.path.exists(requested_path):
            loaded = cv2.imread(requested_path)
            if loaded is not None:
                return loaded, requested_path

    # Check known sample image paths
    known_samples = [
        WORKSPACE_ROOT / "result" / "sample_cutting_tool.jpg",
        WORKSPACE_ROOT / "datasets" / "sample_cutting_tool.jpg",
    ]
    for s_path in known_samples:
        if s_path.exists():
            loaded = cv2.imread(str(s_path))
            if loaded is not None:
                return loaded, str(s_path)

    candidate_dirs = [
        WORKSPACE_ROOT / "datasets" / "processed" / "tool_detection" / "images" / "test",
        WORKSPACE_ROOT / "datasets" / "processed" / "tool_detection" / "images" / "val",
        WORKSPACE_ROOT / "result" / "plots",
    ]

    for c_dir in candidate_dirs:
        if c_dir.exists():
            for ext in ("*.jpg", "*.png", "*.jpeg"):
                for img_file in c_dir.glob(ext):
                    if not img_file.name.startswith("results") and not img_file.name.startswith("Box") and not img_file.name.startswith("confusion") and not img_file.name.startswith("labels"):
                        loaded = cv2.imread(str(img_file))
                        if loaded is not None:
                            return loaded, str(img_file)

    # Fallback to high-fidelity synthetic image
    return create_synthetic_machining_image(), "Synthetic CNC Machining Sample"




def run_model_test(
    image_path: str = None,
    model_path: str = None,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45,
    output_dir: str = None,
    verbose: bool = True
) -> bool:
    """
    Execute comprehensive test on the .pt model weights stored in result/.
    """
    print("\n" + "=" * 70)
    print(" 🛠️  TOOLGUARD AI - MODEL TESTING SUITE (.PT WEIGHTS VERIFICATION)")
    print("=" * 70)

    try:
        resolved_model_path = find_model_weights(model_path)
        print(f"[*] Target Model Weights : {resolved_model_path}")
        print(f"[*] File Size            : {os.path.getsize(resolved_model_path) / (1024*1024):.2f} MB")
    except Exception as e:
        print(f"\n[!] ERROR: Failed to locate model weights: {e}")
        return False

    # Initialize Service
    print("[*] Initializing ToolDetectionService...")
    try:
        service = ToolDetectionService(model_path=resolved_model_path)
        metadata = service.get_model_metadata()
        print(f"[+] Model Successfully Loaded on Device: {metadata['device']}")
        print(f"[+] Target Classes: {metadata['classes']}")
    except Exception as e:
        print(f"\n[!] ERROR: Failed to load model weights: {e}")
        return False

    # Load or generate test image
    test_img, source_desc = find_sample_test_image(image_path)


    print(f"[*] Test Input Image     : {source_desc}")
    print(f"[*] Image Resolution     : {test_img.shape[1]}x{test_img.shape[0]} px (3 Channels)")

    # Run Prediction
    print("[*] Running inference...")
    results = service.predict(
        image_input=test_img,
        conf_threshold=conf_threshold,
        iou_threshold=iou_threshold
    )

    # Display Metrics
    print("\n" + "-" * 70)
    print(" 📈 INFERENCE RESULTS & METRICS")
    print("-" * 70)
    print(f" • Status               : {results['status'].upper()}")
    print(f" • Inference Latency    : {results['inference_latency_ms']} ms")
    print(f" • Effective Throughput : {results['fps']} FPS")
    print(f" • Tool Detected        : {'YES' if results['tool_detected'] else 'NO'}")
    print(f" • Total Detections     : {results['num_detections']}")
    print("-" * 70)

    if results["detections"]:
        print("\n 📍 DETECTED BOUNDING BOXES:")
        print(f"{'ID':<4} | {'Class':<14} | {'Confidence':<12} | {'BBox (xyxy)':<24} | {'Area (px^2)':<12}")
        print("-" * 70)
        for det in results["detections"]:
            bbox_str = f"[{det['bbox_xyxy'][0]:.0f}, {det['bbox_xyxy'][1]:.0f}, {det['bbox_xyxy'][2]:.0f}, {det['bbox_xyxy'][3]:.0f}]"
            print(f"{det['detection_id']:<4} | {det['class_name']:<14} | {det['confidence_percent']:<12} | {bbox_str:<24} | {det['area_pixels']:<12.0f}")
    else:
        print("\n [i] No bounding box met confidence threshold >= " + str(conf_threshold))

    # Save Output Visualizations
    out_dir = Path(output_dir) if output_dir else WORKSPACE_ROOT / "result" / "predictions"
    out_dir.mkdir(parents=True, exist_ok=True)

    annotated_canvas = service.draw_detections(test_img, results)
    pred_save_path = out_dir / "test_detection_result.jpg"
    cv2.imwrite(str(pred_save_path), annotated_canvas)
    print(f"\n[+] Visual Prediction Image Saved to : {pred_save_path}")

    # Crop and Save ROI if detected
    if results["detections"]:
        top_box = results["detections"][0]["bbox_xyxy"]
        cropped_roi = service.crop_tool_roi(test_img, top_box)
        roi_save_path = out_dir / "test_tool_roi_crop.jpg"
        cv2.imwrite(str(roi_save_path), cropped_roi)
        print(f"[+] Cropped Tool ROI Image Saved to : {roi_save_path}")

    print("\n" + "=" * 70)
    print(" ✅ MODEL TEST COMPLETED SUCCESSFULLY!")
    print("=" * 70 + "\n")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test YOLO PyTorch model weights in result/")
    parser.add_argument("--image", "-i", type=str, default=None, help="Path to input test image")
    parser.add_argument("--model", "-m", type=str, default=None, help="Path to .pt weights file")
    parser.add_argument("--conf", "-c", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--iou", type=float, default=0.45, help="IOU threshold")
    parser.add_argument("--output-dir", "-o", type=str, default=None, help="Directory to save prediction visuals")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")

    args = parser.parse_args()

    success = run_model_test(
        image_path=args.image,
        model_path=args.model,
        conf_threshold=args.conf,
        iou_threshold=args.iou,
        output_dir=args.output_dir,
        verbose=args.verbose
    )

    sys.exit(0 if success else 1)
