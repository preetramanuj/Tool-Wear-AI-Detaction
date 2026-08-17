import torch
from ai.wear_analysis.models.unified_multimodal_model import UnifiedMultimodalWearModel

class Phase3AUnifiedModel(UnifiedMultimodalWearModel):
    def __init__(self, target_scaler=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_scaler = target_scaler

    @torch.no_grad()
    def predict(self, image, sensor_features=None):
        out = super().predict(image, sensor_features)
        
        if self.target_scaler is not None:
            norm_val = out['predicted_wear_um']
            if isinstance(norm_val, list):
                raw_um = self.target_scaler.inverse_transform([[x] for x in norm_val]).flatten().tolist()
            else:
                raw_um = float(self.target_scaler.inverse_transform([[norm_val]])[0][0])
            out['predicted_wear_um'] = raw_um
            
        out['model_version'] = 'Phase3A_Target_Balanced_v1.0'
        return out
