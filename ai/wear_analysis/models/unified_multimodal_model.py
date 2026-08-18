import torch
import torch.nn as nn
from torchvision import models

class UnifiedMultimodalWearModel(nn.Module):
    def __init__(self, sensor_dim=5, embedding_dim=256):
        super(UnifiedMultimodalWearModel, self).__init__()
        
        # 1. Image Encoder (EfficientNet-B0)
        self.cnn = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        cnn_out_dim = self.cnn.classifier[1].in_features  # 1280
        self.cnn.classifier = nn.Identity()
        
        self.vision_projector = nn.Sequential(
            nn.Linear(cnn_out_dim, embedding_dim),
            nn.LayerNorm(embedding_dim),
            nn.ReLU()
        )
        
        # 2. Sensor Encoder (Sensor RMS MLP)
        self.sensor_mlp = nn.Sequential(
            nn.Linear(sensor_dim, 64),
            nn.ReLU(),
            nn.Linear(64, embedding_dim),
            nn.LayerNorm(embedding_dim),
            nn.ReLU()
        )
        
        # 3. Fusion Architecture
        # Input dim: Image Emb (256) + Sensor Emb (256) + Modality Mask (2) = 514
        fusion_in_dim = embedding_dim * 2 + 2
        
        self.regressor = nn.Sequential(
            nn.Linear(fusion_in_dim, 256),
            nn.LayerNorm(256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 1)
        )

    def forward(self, image, sensor, mask):
        """
        image: (B, 3, 384, 384)
        sensor: (B, 5)
        mask: (B, 2) -> [img_avail, sens_avail]
        """
        # Vision embedding (Image is always available, mask[:, 0:1] is 1.0)
        v_emb = self.vision_projector(self.cnn(image)) * mask[:, 0:1]
        
        # Sensor embedding (Masked by sensor_avail)
        sens_emb = self.sensor_mlp(sensor) * mask[:, 1:2]
        
        # Concatenate embeddings + explicit modality mask flags
        fused = torch.cat([v_emb, sens_emb, mask], dim=1)
        
        # Wear regression output scalar (B, 1)
        return self.regressor(fused)

    @torch.no_grad()
    def predict(self, image, sensor_features=None):
        """
        Inference API for production use.
        image: (B, 3, 384, 384) tensor or standard transformed image
        sensor_features: Optional (B, 5) tensor
        Returns:
            predicted_wear_um: float or batch array
            input_modalities: string indicating mode
            model_version: string
        """
        self.eval()
        device = next(self.parameters()).device
        
        if image.dim() == 3:
            image = image.unsqueeze(0)
        image = image.to(device)
        B = image.size(0)
        
        if sensor_features is None:
            # IMAGE ONLY mode
            sensor = torch.zeros((B, 5), dtype=torch.float32, device=device)
            mask = torch.tensor([[1.0, 0.0]] * B, dtype=torch.float32, device=device)
            mode_str = "IMAGE ONLY"
        else:
            # IMAGE + SENSOR mode
            if sensor_features.dim() == 1:
                sensor_features = sensor_features.unsqueeze(0)
            sensor = sensor_features.to(device, dtype=torch.float32)
            mask = torch.tensor([[1.0, 1.0]] * B, dtype=torch.float32, device=device)
            mode_str = "IMAGE + SENSOR"
            
        preds = self.forward(image, sensor, mask)
        
        if B == 1:
            wear_out = preds.item()
        else:
            wear_out = preds.cpu().numpy().flatten().tolist()
            
        return {
            'predicted_wear_um': wear_out,
            'input_modalities': mode_str,
            'model_version': 'Phase2_Unified_Multimodal_v1.0'
        }
