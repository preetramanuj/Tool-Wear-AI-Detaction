import pandas as pd
import numpy as np
from PIL import Image
from torchvision import transforms

# ImageNet normalization transform
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

def get_baseline_image_transform(target_size=(384, 384)):
    return transforms.Compose([
        transforms.Resize(target_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

def preprocess_roi_image(image: Image.Image, crop_box: tuple, target_size=(384, 384)):
    """
    Crops set-specific ROI, converts to RGB, resizes to 384x384 and applies ImageNet normalization.
    """
    xmin, ymin, xmax, ymax = crop_box
    cropped = image.crop((xmin, ymin, xmax, ymax)).convert('RGB')
    transform = get_baseline_image_transform(target_size)
    tensor_img = transform(cropped)
    return tensor_img

def extract_tabular_features(df: pd.DataFrame):
    """
    Extracts and standardizes tabular numerical and categorical machining features.
    """
    feat_df = pd.DataFrame()
    
    # 1. Material (Binary: CK45 = 0, RVS 304 = 1)
    feat_df['mat_RVS304'] = df['material'].apply(lambda x: 1.0 if 'RVS' in str(x).upper() else 0.0)

    # 2. Convert numerical columns (Impute '?' in Set 1 with medians of CK45 material)
    def clean_num(val, default_val):
        if pd.isna(val) or str(val).strip() == '?':
            return default_val
        try:
            # Handle fraction strings like '185/148' in Set 6 Vf
            if '/' in str(val):
                parts = [float(p) for p in str(val).split('/')]
                return np.mean(parts)
            return float(val)
        except Exception:
            return default_val

    # Medians for CK45 sets (Sets 2-11)
    feat_df['Vc'] = df['Vc'].apply(lambda x: clean_num(x, 174.0))
    feat_df['n'] = df['n'].apply(lambda x: clean_num(x, 3705.0))
    feat_df['fz'] = df['fz'].apply(lambda x: clean_num(x, 0.048))
    feat_df['Vf'] = df['Vf'].apply(lambda x: clean_num(x, 178.0))
    feat_df['Ae'] = df['Ae'].astype(float)
    feat_df['Ap'] = df['Ap'].astype(float)
    feat_df['z'] = df['z'].astype(float)

    feature_names = feat_df.columns.tolist()
    return feat_df, feature_names
