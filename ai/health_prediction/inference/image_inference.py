import torch
from torchvision import transforms
from PIL import Image
import io
from pathlib import Path
import sys

# Assume src is in Python Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from ai.health_prediction.models.image_only_model import ImageOnlyWearModel

class ImageOnlyInference:
    def __init__(self, model_path, device='cuda'):
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.model = ImageOnlyWearModel(pretrained=False, freeze_backbone=False)
        
        # Load weights safely
        if Path(model_path).exists():
            state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
            self.model.load_state_dict(state_dict)
            
        self.model.to(self.device)
        self.model.eval()
        
        # Load scaler
        scaler_path = Path(model_path).parent / 'target_scaler.pkl'
        if scaler_path.exists():
            import joblib
            self.scaler = joblib.load(scaler_path)
        else:
            self.scaler = None
        
        # Exact preprocessing as training
        self.preprocess = transforms.Compose([
            transforms.CenterCrop(2000),
            transforms.Resize((384, 384)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict(self, image_input):
        """
        image_input: path (str/Path), bytes, or PIL.Image
        """
        if isinstance(image_input, (str, Path)):
            image = Image.open(image_input).convert('RGB')
        elif isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input)).convert('RGB')
        elif isinstance(image_input, Image.Image):
            image = image_input.convert('RGB')
        else:
            raise ValueError("Invalid image input type. Expected path, bytes, or PIL Image.")
            
        tensor = self.preprocess(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            output = self.model(tensor)
            raw_prediction = output.cpu().numpy().reshape(-1, 1)
            
            if self.scaler:
                wear_prediction = self.scaler.inverse_transform(raw_prediction)[0][0]
            else:
                wear_prediction = output.item()
            
        return {
            "wear_um": round(float(wear_prediction), 2),
            "model": "image_only",
            "device": self.device.type
        }
