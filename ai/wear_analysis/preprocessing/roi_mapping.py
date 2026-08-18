import pandas as pd
import os
from PIL import Image

SETS_CSV_PATH = os.path.join('datasets', 'raw', 'MATWI', 'sets.csv')

def load_sets_metadata():
    if not os.path.exists(SETS_CSV_PATH):
        raise FileNotFoundError(f"sets.csv not found at {SETS_CSV_PATH}")
    df = pd.read_csv(SETS_CSV_PATH)
    # Standardize Set column name
    col_name = 'Unnamed: 0' if 'Unnamed: 0' in df.columns else df.columns[0]
    df['set_id'] = df[col_name].apply(lambda x: int(str(x).replace('Set', '').strip()))
    return df

def parse_crop_box(crop_str):
    """
    Parses crop bounding box string 'xmin, ymin, xmax, ymax' into integers.
    """
    if pd.isna(crop_str) or not isinstance(crop_str, str):
        return None
    try:
        coords = [int(c.strip()) for c in crop_str.split(',')]
        if len(coords) == 4:
            xmin, ymin, xmax, ymax = coords
            return {
                'crop_xmin': xmin,
                'crop_ymin': ymin,
                'crop_xmax': xmax,
                'crop_ymax': ymax,
                'roi_width': xmax - xmin,
                'roi_height': ymax - ymin
            }
    except Exception as e:
        pass
    return None

def get_roi_coordinates(set_id, sets_df=None):
    if sets_df is None:
        sets_df = load_sets_metadata()
    row = sets_df[sets_df['set_id'] == set_id]
    if row.empty:
        raise ValueError(f"Set ID {set_id} not found in sets.csv")
    crop_str = row.iloc[0]['crop']
    parsed = parse_crop_box(crop_str)
    if parsed is None:
        raise ValueError(f"Could not parse ROI crop box for Set {set_id}: '{crop_str}'")
    return parsed

def crop_roi_image(image: Image.Image, bbox: dict) -> Image.Image:
    """
    Crops PIL Image using bounding box dictionary containing xmin, ymin, xmax, ymax.
    """
    box = (bbox['crop_xmin'], bbox['crop_ymin'], bbox['crop_xmax'], bbox['crop_ymax'])
    return image.crop(box)
